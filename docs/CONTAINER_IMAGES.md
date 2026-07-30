# Container images

[Português (Brasil)](CONTAINER_IMAGES.pt-BR.md) · [English](CONTAINER_IMAGES.md)

Ebyte Game Panel publishes its project-specific images to:

```text
ghcr.io/elvisfalmeida/ebyte-game-panel-*
```

The `publish-container-images.yml` workflow rebuilds every image from this
repository and publishes version, `latest`, and immutable commit tags together
with an SBOM, provenance attestation, and OCI metadata.

Native catalog entries, installation, and updates use the Ebyte namespace.
Official upstream base images remain external dependencies. Proprietary game
binaries are obtained from their official distribution channels at installation
time and remain subject to each publisher's license, EULA, and authentication.
