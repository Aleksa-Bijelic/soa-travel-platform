using Microsoft.EntityFrameworkCore;
using TourService.Models;

namespace TourService.Data;

public class TourDbContext(DbContextOptions<TourDbContext> options) : DbContext(options)
{
    public DbSet<Tour> Tours => Set<Tour>();
    public DbSet<KeyPoint> KeyPoints => Set<KeyPoint>();
    public DbSet<TourDuration> TourDurations => Set<TourDuration>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<TourExecution> TourExecutions => Set<TourExecution>();
    public DbSet<CompletedKeyPoint> CompletedKeyPoints => Set<CompletedKeyPoint>();
    public DbSet<TourSession> TourSessions => Set<TourSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tour>()
            .Property(t => t.Tags)
            .HasColumnType("text[]");

        modelBuilder.Entity<Tour>()
            .Property(t => t.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Tour>()
            .Property(t => t.Difficulty)
            .HasConversion<string>();

        modelBuilder.Entity<TourDuration>()
            .Property(d => d.TransportType)
            .HasConversion<string>();

        modelBuilder.Entity<KeyPoint>()
            .HasOne(k => k.Tour)
            .WithMany(t => t.KeyPoints)
            .HasForeignKey(k => k.TourId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TourDuration>()
            .HasOne(d => d.Tour)
            .WithMany(t => t.Durations)
            .HasForeignKey(d => d.TourId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Review>()
            .HasOne(r => r.Tour)
            .WithMany()
            .HasForeignKey(r => r.TourId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Review>()
            .Property(r => r.ImageUrls)
            .HasColumnName("ImageBase64s")
            .HasColumnType("text[]");

        modelBuilder.Entity<TourExecution>()
            .Property(e => e.Status)
            .HasConversion<string>();

        modelBuilder.Entity<TourExecution>()
            .HasOne(e => e.Tour)
            .WithMany()
            .HasForeignKey(e => e.TourId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CompletedKeyPoint>()
            .HasOne(c => c.TourExecution)
            .WithMany(e => e.CompletedKeyPoints)
            .HasForeignKey(c => c.TourExecutionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TourSession>()
            .HasOne(s => s.Tour)
            .WithMany()
            .HasForeignKey(s => s.TourId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
