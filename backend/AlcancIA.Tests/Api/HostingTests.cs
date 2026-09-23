using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlcancIA.Tests.Api;

public class HostingTests
{
    [Fact]
    public void Production_refuses_to_start_without_its_secrets()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Production");
            b.ConfigureAppConfiguration(c => c.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Database"] = "",
                ["Auth:SigningKey"] = "corta",
            }));
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        var message = error.ToString();
        Assert.Contains("ConnectionStrings__Database", message);
        Assert.Contains("Auth__SigningKey", message);
        Assert.Contains("DataProtection__MasterKey", message);
        Assert.DoesNotContain("corta", message); // never echo secret values
    }

    [Fact]
    public async Task Responses_carry_security_headers_and_are_never_cached()
    {
        using var factory = new ApiFactory();
        var response = await factory.CreateClient().GetAsync("/health");
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Contains("no-store", response.Headers.CacheControl!.ToString());
    }

    [Fact]
    public async Task Readiness_checks_the_database()
    {
        using var factory = new ApiFactory();
        var response = await factory.CreateClient().GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

public class MasterKeyEncryptionTests
{
    [Fact]
    public void Key_ring_xml_round_trips_and_is_not_readable_without_the_master_key()
    {
        var key = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        var secret = new System.Xml.Linq.XElement("key", new System.Xml.Linq.XElement("masterKey", "SUPER-SECRETO-123"));
        var encrypted = new AlcancIA.Infrastructure.Persistence.MasterKeyXmlEncryptor(key).Encrypt(secret);
        Assert.DoesNotContain("SUPER-SECRETO-123", encrypted.EncryptedElement.ToString());

        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection()
            .AddSingleton<Microsoft.Extensions.Configuration.IConfiguration>(new Microsoft.Extensions.Configuration.ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:MasterKey"] = Convert.ToBase64String(key) }).Build())
            .BuildServiceProvider();
        var decrypted = new AlcancIA.Infrastructure.Persistence.MasterKeyXmlDecryptor(services).Decrypt(encrypted.EncryptedElement);
        Assert.Equal("SUPER-SECRETO-123", decrypted.Element("masterKey")!.Value);

        var wrong = new Microsoft.Extensions.DependencyInjection.ServiceCollection()
            .AddSingleton<Microsoft.Extensions.Configuration.IConfiguration>(new Microsoft.Extensions.Configuration.ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:MasterKey"] = Convert.ToBase64String(new byte[32]) }).Build())
            .BuildServiceProvider();
        Assert.ThrowsAny<System.Security.Cryptography.CryptographicException>(() =>
        {
            new AlcancIA.Infrastructure.Persistence.MasterKeyXmlDecryptor(wrong).Decrypt(encrypted.EncryptedElement);
        });
    }
}
