namespace TourService.Models;

public class TourSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TourId { get; set; }
    public string GuideId { get; set; } = null!;
    public DateTime SessionDate { get; set; }
    public int MaxCapacity { get; set; }
    public decimal PricePerPerson { get; set; }
    public string Location { get; set; } = null!;
    public string Status { get; set; } = "scheduled";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tour? Tour { get; set; }
}
