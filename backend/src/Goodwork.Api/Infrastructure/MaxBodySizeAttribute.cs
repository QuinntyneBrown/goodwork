using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Goodwork.Api.Infrastructure;

/// <summary>
/// Rejects request bodies over the limit with 413. A declared Content-Length is refused
/// before the body is read; chunked bodies are cut off by the server's own limit.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class MaxBodySizeAttribute(long maxBytes) : Attribute, IResourceFilter
{
    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        var request = context.HttpContext.Request;
        if (request.ContentLength > maxBytes)
        {
            context.Result = new StatusCodeResult(StatusCodes.Status413PayloadTooLarge);
            return;
        }

        var feature = context.HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (feature is { IsReadOnly: false })
        {
            feature.MaxRequestBodySize = maxBytes;
        }
    }

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }
}
