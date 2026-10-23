using Microsoft.Extensions.Options;

namespace Goodwork.Api.Infrastructure;

/// <summary>Refuses state-changing requests that a browser sends from another origin.</summary>
public sealed class SameOriginMiddleware(RequestDelegate next, IOptions<AllowedOriginsOptions> options)
{
    public Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        if (!HttpMethods.IsGet(request.Method) && !HttpMethods.IsHead(request.Method)
            && request.Headers.Origin.Count > 0 && !IsAllowed(request.Headers.Origin.ToString(), request.Host))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        }

        return next(context);
    }

    private bool IsAllowed(string origin, HostString host) =>
        Uri.TryCreate(origin, UriKind.Absolute, out var uri)
        && (string.Equals(uri.Authority, host.Value, StringComparison.OrdinalIgnoreCase)
            || options.Value.Origins.Contains(origin.TrimEnd('/'), StringComparer.OrdinalIgnoreCase));
}
