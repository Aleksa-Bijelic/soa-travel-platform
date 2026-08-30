namespace TourService.Models;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TourId { get; set; }
    public Tour Tour { get; set; } = null!;
    public string TouristId { get; set; } = null!;
    public int Rating { get; set; }
    public string Comment { get; set; } = null!;
    public DateTime VisitedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<string> ImageUrls { get; set; } = [];
    public string TouristUsername { get; set; } = null!;
    public string TouristEmail { get; set; } = null!;
}