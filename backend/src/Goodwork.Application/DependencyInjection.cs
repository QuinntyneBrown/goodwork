using FluentValidation;
using Goodwork.Application.Common;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Goodwork.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(c => c.RegisterServicesFromAssemblyContaining<ApplicationMarker>());
        services.AddValidatorsFromAssemblyContaining<ApplicationMarker>();
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        return services;
    }
}
