locals {
  static_files = fileset("../frontend", "**")
}

resource "google_storage_bucket_object" "frontend_files" {
  for_each = { for f in local.static_files : f => f }

  name   = each.key
  bucket = google_storage_bucket.frontend.name
  source = "../frontend/${each.value}"
  content_type = lookup({
    "html" = "text/html",
    "css"  = "text/css",
    "js"   = "application/javascript",
    "png"  = "image/png",
    "jpg"  = "image/jpeg",
    "svg"  = "image/svg+xml",
  }, reverse(split(".", each.value))[0], "application/octet-stream")
}