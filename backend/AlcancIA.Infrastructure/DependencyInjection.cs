using AlcancIA.Application.Ai;
using AlcancIA.Infrastructure.Ai;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AlcancIA.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers the AI provider by configuration (§41/§70). If Gemini is enabled
    /// and configured, it is used; otherwise the always-available local provider is
    /// registered so chat works with zero setup.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<AiOptions>(config.GetSection(AiOptions.SectionName));

        services.AddHttpClient<GeminiAiProvider>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<AiOptions>>().Value;
            client.BaseAddress = new Uri(options.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 5, 60));
        });

        services.AddScoped<LocalAiProvider>();

        services.AddScoped<IAiProvider>(sp =>
        {
            var options = sp.GetRequiredService<IOptions<AiOptions>>().Value;
            var wantsGemini = options.Enabled &&
                              options.Provider.Equals("gemini", StringComparison.OrdinalIgnoreCase);

            if (wantsGemini)
            {
                var gemini = sp.GetRequiredService<GeminiAiProvider>();
                if (gemini.IsConfigured)
                {
                    return gemini;
                }
            }

            return sp.GetRequiredService<LocalAiProvider>();
        });

        services.AddScoped<IChatService, ChatService>();

        return services;
    }

    /// <summary>
    /// PostgreSQL (ConnectionStrings:Database) plus the Data Protection key ring
    /// persisted in the same database. Tests replace the DbContext options.
    /// </summary>
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration config)
    {
        var connection = config.GetConnectionString("Database");
        services.AddDbContext<AppDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connection)) options.UseNpgsql(connection);
        });

        var dataProtection = services.AddDataProtection()
            .SetApplicationName("AlcancIA")
            .PersistKeysToDbContext<AppDbContext>();

        // Key ring encrypted with a master key kept outside the database (required in production).
        if (MasterKeyXmlEncryptor.ReadMasterKey(config) is { } masterKey)
            dataProtection.Services.Configure<KeyManagementOptions>(o => o.XmlEncryptor = new MasterKeyXmlEncryptor(masterKey));

        return services;
    }
}
