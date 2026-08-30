package com.example.blogservice.controller;

import com.cloudinary.Cloudinary;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/blogs")
public class BlogImageController {

    private final Cloudinary cloudinary;

    public BlogImageController(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestPart("file") MultipartFile file,
            HttpServletRequest httpRequest) throws IOException {

        String authorId = (String) httpRequest.getAttribute("userId");
        if (authorId == null || authorId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (cloudinary == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Image upload service is not configured."));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image file is required."));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Uploaded file must be an image."));
        }

        var result = cloudinary.uploader().upload(
                file.getBytes(),
                Map.of(
                        "folder", "blog-service",
                        "resource_type", "image"
                ));

        String url = (String) result.get("secure_url");
        return ResponseEntity.ok(Map.of("url", url));
    }
}
