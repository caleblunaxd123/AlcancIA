using AlcancIA.Application.Ai;
using AlcancIA.Infrastructure.Ai;
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
}
