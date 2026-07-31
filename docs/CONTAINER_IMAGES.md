# Container images

[Português (Brasil)](CONTAINER_IMAGES.pt-BR.md) · [English](CONTAINER_IMAGES.md)

Ebyte Game Panel publishes its project-specific images to:

```text
ghcr.io/elvisfalmeida/ebyte-game-panel-*
```

The `publish-container-images.yml` workflow rebuilds every image from this
repository and publishes version, `latest`, and immutable commit tags together
with an SBOM, provenance attestation, and OCI metadata.

Palworld image `1.2.1` enables community-server mode by default and builds the
advertising arguments from the detected public IPv4 address. An explicit
`PALWORLD_START_PARAMS` value always takes precedence.

Native catalog entries, installation, and updates use the Ebyte namespace.
Official upstream base images remain external dependencies. Proprietary game
binaries are obtained from their official distribution channels at installation
time and remain subject to each publisher's license, EULA, and authentication.

The workflow can publish every family or a single selected matrix entry during
a manual run.
