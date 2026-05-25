variable "aws_region" {
  description = "AWS region to create resources in"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name for the key pair to create"
  type        = string
  default     = "aegismesh-key"
}

variable "public_key" {
  description = "Public SSH key (openssh format) to create an EC2 keypair"
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "CIDR range allowed for SSH access"
  type        = string
  default     = "0.0.0.0/0"
}

variable "allow_cidr" {
  description = "CIDR range allowed for public ingress (HTTP/HTTPS/NodePort). REQUIRED: set to a secure CIDR (no default to avoid accidental public exposure)."
  type        = string

  validation {
    condition     = !(var.allow_cidr == "0.0.0.0/0" || var.allow_cidr == "::/0")
    error_message = "Refusing a permissive allow_cidr (0.0.0.0/0 or ::/0). Provide a more restrictive CIDR when deploying."
  }
}

variable "associate_public_ip" {
  description = "Whether to assign a public IP to the EC2 instance. Set to true only for bastion hosts or when public access is explicitly required."
  type        = bool
  default     = false
}

# Optional: override in terraform.tfvars or with -var 'associate_public_ip=true'
