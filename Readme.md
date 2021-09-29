## How to use this action

This action helps you check **pull request** commits signatures for DCO (Developer Certificate of Origin) and GPG verification

For default, GPG validation is disabled but you can easily change that using an environment variable:

[Learn more about GPG verification for your commits](https://docs.github.com/pt/github/authenticating-to-github/managing-commit-signature-verification/about-commit-signature-verification)

e.g:
```sh
name: DCO GPG VALIDATOR
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

jobs:
  dco-gpg-validator:
    runs-on: ubuntu-latest
    steps:
      - uses: ZupIT/zup-dco-validator@v1.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VALIDATE_GPG: false
```

Note: This action needs permission for writing on the checks endpoint of the github API. Keep that in mind in case you need to change the default permissions for the GITHUB_TOKEN.

## Contributing

If you have suggestions for how dco-validator could be improved, or want to report a bug, open an issue! We'd love all and any contributions.
