using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TourService.Data;
using TourService.DTOs;
using TourService.Models;

namespace TourService.Controllers;

[ApiController]
[Route("tours/{tourId:guid}/sessions")]
public class TourSessionController(TourDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<TourSessionResponse>> CreateSession(Guid tourId, [FromBody] CreateTourSessionRequest request)
    {
        var guideId = HttpContext.Items["userId"] as string;
        if (string.IsNullOrEmpty(guideId)) return Unauthorized();

        var tour = await db.Tours.FindAsync(tourId);
        if (tour == null) return NotFound("Tour not found");
        if (tour.AuthorId != guideId) return Forbid();
        if (tour.Status != Models.Enums.TourStatus.Published)
            return BadRequest("Tour must be published to create sessions");

        var session = new TourSession
        {
            TourId = tourId,
            GuideId = guideId,
            SessionDate = request.SessionDate,
            MaxCapacity = request.MaxCapacity,
            PricePerPerson = request.PricePerPerson,
            Location = request.Location,
        };

        db.TourSessions.Add(session);
        await db.SaveChangesAsync();

        return Ok(MapToResponse(session, tour.Name));
    }

    [HttpGet]
    public async Task<ActionResult<List<TourSessionResponse>>> GetSessions(Guid tourId)
    {
        var userId = HttpContext.Items["userId"] as string;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var sessions = await db.TourSessions
            .Where(s => s.TourId == tourId)
            .OrderBy(s => s.SessionDate)
            .ToListAsync();

        var tourNames = await db.Tours
            .Where(t => sessions.Select(s => s.TourId).Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        return Ok(sessions.Select(s => MapToResponse(s, tourNames.GetValueOrDefault(s.TourId))).ToList());
    }

    [HttpGet("all")]
    public async Task<ActionResult<List<TourSessionResponse>>> GetAllSessions()
    {
        var userId = HttpContext.Items["userId"] as string;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var sessions = await db.TourSessions
            .Where(s => s.SessionDate > DateTime.UtcNow && s.Status == "scheduled")
            .OrderBy(s => s.SessionDate)
            .ToListAsync();

        var tourIds = sessions.Select(s => s.TourId).Distinct().ToList();
        var tourNames = await db.Tours
            .Where(t => tourIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.Name);

        return Ok(sessions.Select(s => MapToResponse(s, tourNames.GetValueOrDefault(s.TourId))).ToList());
    }

    [HttpGet("{sessionId:guid}")]
    public async Task<ActionResult<TourSessionResponse>> GetSession(Guid tourId, Guid sessionId)
    {
        var userId = HttpContext.Items["userId"] as string;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var session = await db.TourSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.TourId == tourId);
        if (session == null) return NotFound();

        var tour = await db.Tours.FindAsync(session.TourId);
        return Ok(MapToResponse(session, tour?.Name));
    }

    private static TourSessionResponse MapToResponse(TourSession s, string? tourName) => new(
        s.Id, s.TourId, s.GuideId, s.SessionDate, s.MaxCapacity,
        s.PricePerPerson, s.Location, s.Status, s.CreatedAt, tourName
    );
}
