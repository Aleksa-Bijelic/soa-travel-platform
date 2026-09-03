namespace TourService.DTOs;

public record CreateTourSessionRequest(
    DateTime SessionDate,
    int MaxCapacity,
    decimal PricePerPerson,
    string Location
);

public record TourSessionResponse(
    Guid Id,
    Guid TourId,
    string GuideId,
    DateTime SessionDate,
    int MaxCapacity,
    decimal PricePerPerson,
    string Location,
    string Status,
    DateTime CreatedAt,
    string? TourName
);
