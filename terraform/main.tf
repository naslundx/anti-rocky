terraform {
  backend "gcs" {
    bucket = "anti-rocky"
    prefix = "terraform"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "6.34.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "2.7.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "2.5.2"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

variable "gcp_services" {
  type = list(string)
  default = [
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com"
    #    "secretmanager.googleapis.com",
    #    "cloudfunctions.googleapis.com",
    #    "pubsub.googleapis.com",
    #    "eventarc.googleapis.com",
    #    "gmail.googleapis.com",
    #    "firestore.googleapis.com"
  ]
}

resource "google_project_service" "enabled_services" {
  provider = google
  for_each = toset(var.gcp_services)

  service = each.value
}