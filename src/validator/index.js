/*
 * Copyright 2020 ZUP IT SERVICOS EM TECNOLOGIA E INOVACAO SA
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const github = require('@actions/github');

const validateCommitSignatures = () => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
  let { payload, repo, eventName, sha, ref } = github.context
  const { pull_request: pr } = payload

  if (pr !== undefined) {
    sha = pr.head.sha
    ref = pr.head.ref
  }

  const status = {
    name: 'Result',
    head_branch: ref,
    head_sha: sha,
    status: 'completed',
    started_at: new Date(),
    ...repo
  }

  const loadCommitsForPullRequest = (commitsUrl) => {
    return octokit.request({ method: "GET", url: commitsUrl })
  }

  const checkCommitsGpgVerification = (commits) => {
    return commits
      .filter(({ commit }) => !commit.verification.verified)
      .map((commit) => commit.sha)
  }

  const checkCommitsSignOff = (commits) => {
    const re = /(Signed-off-by:\s*)(.+)<(.+@.+)>/

    return commits.filter((commit) => {
      const { commit: commitDetail } = commit
      const match = re.exec(commitDetail.message)
      if (!match) return commit


      const [_full, _sign, author, email] = match

      if (commitDetail.author.name !== author.trim() || commitDetail.author.email !== email)
        return commit

      return null

    }).map(commit => commit.sha)

  }


  const createFailedCheckVerification = (...failedCommits) => {

    const [notSigned, notVerified] = failedCommits

    const message = `${notSigned.length ? `Some commits are incorrectly signed off :
      ${notSigned.map(commitSha => `\n ${commitSha}`).join(' ')}` : ''}
    ${notVerified.length ? `\nGPG Verification not found for some commits :
      ${notVerified.map(commitSha => `\n ${commitSha}`).join(' ')}` : ''}
    `

    const failureStatus = {
      ...status,
      conclusion: 'failure',
      completed_at: new Date(),
      output: {
        title: 'Failed Validation - Problems were found in some of your commits',
        summary: message
      }
    }

    return octokit.rest.checks.create(failureStatus)
  }

  const createSuccessCheckVerification = () => {

    const successStatus = {
      ...status,
      conclusion: 'success',
      completed_at: new Date(),
      output: {
        title: 'Successful Validation',
        summary: `Congrats, all your commits are signed!`
      }
    }

    return octokit.rest.checks.create(successStatus)

  }

  const start = async () => {
    const shouldVerifyGpg = process.env.VALIDATE_GPG || false
    let notSignedCommits = []
    let notGpgVerifiedCommits = []


    const { data: prCommits } = await loadCommitsForPullRequest(pr.commits_url)

    notSignedCommits = checkCommitsSignOff(prCommits)
    console.log('NOT SIGNED COMMITS', notSignedCommits)


    if (shouldVerifyGpg === true)
      notGpgVerifiedCommits = checkCommitsGpgVerification(prCommits)

    console.log('NOT GPG VERIFIED COMMITS', notGpgVerifiedCommits)

    if (notSignedCommits.length || notGpgVerifiedCommits.length)
      return await createFailedCheckVerification(notSignedCommits, notGpgVerifiedCommits)

    return createSuccessCheckVerification()
  }

  if (eventName === 'pull_request') {
    return start()
  } else {

    const failedCheck = {
      ...status,
      conclusion: 'failure',
      completed_at: new Date(),
      output: {
        title: 'Failed Validation',
        summary: 'Please, make sure you are using the correct configuration for this action. https://github.com/ZupIT/zup-dco-validator'
      }
    }

    return octokit.rest.checks.create(failedCheck)
  }


}

module.exports = validateCommitSignatures