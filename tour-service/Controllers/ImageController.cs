using Microsoft.AspNetCore.Mvc;
using TourService.Services;

namespace TourService.Controllers;

[ApiController]
[Route("tours")]
public class ImageController(ICloudinaryService cloudinaryService) : ControllerBase
{
    [HttpPost("images")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        var authorId = HttpContext.Items["userId"] as string;
        if (string.IsNullOrEmpty(authorId)) return Unauthorized();

        if (!cloudinaryService.IsConfigured)
            return StatusCode(503, new { error = "Image upload service is not configured." });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Image file is required." });

        if (!file.ContentType.StartsWith("image/"))
            return BadRequest(new { error = "Uploaded file must be an image." });

        using var stream = file.OpenReadStream();
        var url = await cloudinaryService.UploadImageAsync(stream, file.FileName);
        return Ok(new { url });
    }
}
