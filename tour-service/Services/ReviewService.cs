using TourService.Clients;
using TourService.DTOs;
using TourService.Models;
using TourService.Models.Enums;
using TourService.Repositories;

namespace TourService.Services;

public class ReviewService(
    IReviewRepository reviewRepository,
    ITourRepository tourRepository,
    IPurchaseClient purchaseClient,
    IStakeholdersClient stakeholdersClient) : IReviewService
{
    public async Task<ReviewResponse> CreateReviewAsync(string touristId, Guid tourId, CreateReviewRequest request)
    {
        var tour = await tourRepository.GetByIdAsync(tourId) ?? throw new KeyNotFoundException("Tour not found");

        if (tour.Status != TourStatus.Published && tour.Status != TourStatus.Archived)
            throw new InvalidOperationException("Can only review published or archived tours");

        if (await reviewRepository.HasReviewedAsync(touristId, tourId))
            throw new InvalidOperationException("You have already reviewed this tour");

        var userInfo = await stakeholdersClient.GetUserAsync(touristId);
        if (userInfo == null)
            throw new KeyNotFoundException("Tourist not found");

        var review = new Review
        {
            TourId = tourId,
            TouristId = touristId,
            TouristUsername = userInfo.Username,
            TouristEmail = userInfo.Email,
            Rating = request.Rating,
            Comment = request.Comment,
            VisitedAt = request.VisitedAt,
            ImageUrls = request.ImageUrls
        };

        var created = await reviewRepository.CreateAsync(review);
        return MapToResponse(created);
    }

    public async Task<List<ReviewResponse>> GetReviewsForTourAsync(Guid tourId)
    {
        var reviews = await reviewRepository.GetByTourIdAsync(tourId);
        return reviews.Select(MapToResponse).ToList();
    }

    private static ReviewResponse MapToResponse(Review r) => new()
    {
        Id = r.Id,
        TourId = r.TourId,
        TouristId = r.TouristId,
        TouristUsername = r.TouristUsername,
        TouristEmail = r.TouristEmail,
        Rating = r.Rating,
        Comment = r.Comment,
        VisitedAt = r.VisitedAt,
        CreatedAt = r.CreatedAt,
        ImageUrls = r.ImageUrls
    };
}