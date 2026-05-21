output "instance_id" {
  value = aws_instance.node.id
}

output "public_ip" {
  value = aws_instance.node.public_ip
}

output "ecr_backend_repo" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repo" {
  value = aws_ecr_repository.frontend.repository_url
}
