using Goodwork.Api.Infrastructure;
using Goodwork.Api.Workers;
using Goodwork.Application;
using Goodwork.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<StorageExceptionHandler>();
builder.Services.AddContactRateLimiting();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

if (builder.Configuration.GetValue("Workers:Enabled", true))
{
    builder.Services.AddHostedService<ContactRequestDeliveryWorker>();
    builder.Services.AddHostedService<ContactRequestRetentionWorker>();
}

builder.Services.Configure<AllowedOriginsOptions>(o =>
    o.Origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? []);
builder.Services.AddHsts(o =>
{
    o.MaxAge = TimeSpan.FromDays(365);
    o.IncludeSubDomains = true;
    o.ExcludedHosts.Clear();
});
builder.Services.AddHttpsRedirection(o => o.HttpsPort = builder.Configuration.GetValue("HttpsRedirection:Port", 443));
builder.Services.AddAuthentication();
builder.Services.AddAuthorization(o =>
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
if (builder.Configuration.GetValue("ForwardedHeaders:Enabled", false))
{
    // Behind a reverse proxy, trust its X-Forwarded-* headers so the client address and scheme are real.
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
    });
}

var app = builder.Build();

if (builder.Configuration.GetValue("ForwardedHeaders:Enabled", false))
{
    app.UseForwardedHeaders();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Angular fingerprints every asset except the shell, so assets can be cached for good.
        var isShell = context.File.Name == "index.html";
        context.Context.Response.Headers.CacheControl = isShell ? "no-cache" : "public, max-age=31536000, immutable";
    },
});

// Routing comes after static files: a matched endpoint (the SPA fallback) would otherwise hide every asset.
app.UseRouting();
app.UseMiddleware<SameOriginMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
// Unknown API paths are real 404s; every other unmatched path is a client-side route.
app.Map("/api/{**path}", () => Results.NotFound()).AllowAnonymous();
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    OnPrepareResponse = context => context.Context.Response.Headers.CacheControl = "no-cache",
}).AllowAnonymous();

app.Run();

public partial class Program;
