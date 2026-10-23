using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Goodwork.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContactRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 254, nullable: false),
                    Message = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    ReceivedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    DeliveryStatus = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    DeliveryAttempts = table.Column<int>(type: "INTEGER", nullable: false),
                    NextAttemptAt = table.Column<long>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContactRequests_DeliveryStatus_NextAttemptAt",
                table: "ContactRequests",
                columns: new[] { "DeliveryStatus", "NextAttemptAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContactRequests_ReceivedAt",
                table: "ContactRequests",
                column: "ReceivedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContactRequests");
        }
    }
}
