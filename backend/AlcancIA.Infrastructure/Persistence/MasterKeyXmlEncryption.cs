using System.Security.Cryptography;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.XmlEncryption;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlcancIA.Infrastructure.Persistence;

/// <summary>
/// Encrypts the Data Protection key ring (stored in the same database as the
/// user data) with AES-256-GCM under a master key that lives OUTSIDE the
/// database (DataProtection:MasterKey, base64 32 bytes, from the host's secrets).
/// A database dump alone is therefore not enough to decrypt user data.
/// </summary>
public sealed class MasterKeyXmlEncryptor(byte[] masterKey) : IXmlEncryptor
{
    public const string ConfigKey = "DataProtection:MasterKey";

    public EncryptedXmlInfo Encrypt(XElement plaintextElement)
    {
        var plaintext = System.Text.Encoding.UTF8.GetBytes(plaintextElement.ToString(SaveOptions.DisableFormatting));
        var nonce = RandomNumberGenerator.GetBytes(AesGcm.NonceByteSizes.MaxSize);
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];
        var ciphertext = new byte[plaintext.Length];
        using (var aes = new AesGcm(masterKey, tag.Length)) aes.Encrypt(nonce, plaintext, ciphertext, tag);
        CryptographicOperations.ZeroMemory(plaintext);

        var element = new XElement("masterKeyEncrypted",
            new XAttribute("v", "1"),
            new XElement("nonce", Convert.ToBase64String(nonce)),
            new XElement("tag", Convert.ToBase64String(tag)),
            new XElement("value", Convert.ToBase64String(ciphertext)));
        return new EncryptedXmlInfo(element, typeof(MasterKeyXmlDecryptor));
    }

    /// <summary>Reads and validates the master key; null when not configured.</summary>
    public static byte[]? ReadMasterKey(IConfiguration config)
    {
        var raw = config[ConfigKey];
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var key = Convert.FromBase64String(raw);
        return key.Length == 32 ? key : throw new InvalidOperationException($"{ConfigKey} must be 32 bytes (base64).");
    }
}

/// <summary>Created by Data Protection through its (IServiceProvider) constructor.</summary>
public sealed class MasterKeyXmlDecryptor(IServiceProvider services) : IXmlDecryptor
{
    public XElement Decrypt(XElement encryptedElement)
    {
        var key = MasterKeyXmlEncryptor.ReadMasterKey(services.GetRequiredService<IConfiguration>())
            ?? throw new InvalidOperationException($"{MasterKeyXmlEncryptor.ConfigKey} is required to read the key ring.");
        var nonce = Convert.FromBase64String((string)encryptedElement.Element("nonce")!);
        var tag = Convert.FromBase64String((string)encryptedElement.Element("tag")!);
        var ciphertext = Convert.FromBase64String((string)encryptedElement.Element("value")!);
        var plaintext = new byte[ciphertext.Length];
        using (var aes = new AesGcm(key, tag.Length)) aes.Decrypt(nonce, ciphertext, tag, plaintext);
        try { return XElement.Parse(System.Text.Encoding.UTF8.GetString(plaintext)); }
        finally { CryptographicOperations.ZeroMemory(plaintext); }
    }
}
