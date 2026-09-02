using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace TourService.Services;

public interface ICloudinaryService
{
    Task<string?> UploadImageAsync(Stream fileStream, string fileName, string folder = "tour-service");
    bool IsConfigured { get; }
}

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary? _cloudinary;

    public bool IsConfigured => _cloudinary != null;

    public CloudinaryService(IConfiguration configuration)
    {
        var cloudName = configuration["CLOUDINARY_CLOUD_NAME"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
        var apiKey = configuration["CLOUDINARY_API_KEY"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
        var apiSecret = configuration["CLOUDINARY_API_SECRET"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");

        if (string.IsNullOrEmpty(cloudName) || cloudName == "your_cloud_name")
        {
            Console.WriteLine("WARNING: Cloudinary not configured, image upload will be unavailable");
            _cloudinary = null;
            return;
        }

        _cloudinary = new Cloudinary(new Account(cloudName, apiKey, apiSecret));
        _cloudinary.Api.Secure = true;
    }

    public async Task<string?> UploadImageAsync(Stream fileStream, string fileName, string folder = "tour-service")
    {
        if (_cloudinary == null)
            throw new InvalidOperationException("Cloudinary is not configured");

        var uploadParams = new ImageUploadParams
        {
            Folder = folder,
            File = new FileDescription(fileName, fileStream),
            Overwrite = true
        };

        var result = await _cloudinary.UploadAsync(uploadParams);
        return result.SecureUrl?.AbsoluteUri;
    }
}
