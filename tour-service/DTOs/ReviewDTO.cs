using System.ComponentModel.DataAnnotations;

namespace TourService.DTOs;

public class CreateReviewRequest
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [Required]
    public string Comment { get; set; } = null!;

    [Required]
    public DateTime VisitedAt { get; set; }
    public List<string> ImageUrls { get; set; } = [];
}

public class ReviewResponse
{
    public Guid Id { get; set; }
    public Guid TourId { get; set; }
    public string TouristId { get; set; } = null!;
    public string TouristUsername { get; set; } = null!;
    public string TouristEmail { get; set; } = null!;
    public int Rating { get; set; }
    public string Comment { get; set; } = null!;
    public DateTime VisitedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> ImageUrls { get; set; } = [];
}