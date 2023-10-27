import type { GetStaticProps, NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Header, USER_GUIDE_LINK } from '../../components/Header'
import { Footer } from '../../components/Footer'
import { listModuleNames, Metadata } from '../../data/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope } from '@fortawesome/free-regular-svg-icons'
import { CopyCode } from '../../components/CopyCode'
import React, { useEffect, useState } from 'react'
import {
  getStaticPropsModulePage,
  VersionInfo,
} from '../../data/moduleStaticProps'
import { formatDistance, parseISO } from 'date-fns'

interface ModulePageProps {
  metadata: Metadata
  versionInfos: VersionInfo[]
  selectedVersion: string
  reverseDependencies: string[]
}

// The number of versions that should be displayed on initial page-load (before clicking "show all").
const NUM_VERSIONS_ON_PAGE_LOAD = 5
// The number of reverse dependencies that should be displayed on initial page-load (before clicking "show all").
const NUM_REVERSE_DEPENDENCIES_ON_PAGE_LOAD = 5

const ModulePage: NextPage<ModulePageProps> = ({
  metadata,
  versionInfos,
  selectedVersion,
  reverseDependencies,
}) => {
  const router = useRouter()
  const { module } = router.query
  // There may be multiple GitHub repositories specified for a module, but for now
  // the UI will only display information about the first one in the list.
  const firstGithubRepository = metadata.repository?.find((repo) =>
    repo.startsWith('github:')
  )

  const [triggeredShowAllVersions, setTriggeredShowAllVersions] =
    useState(false)
  const [
    triggeredShowAllReverseDependencies,
    setTriggeredShowAllReverseDependencies,
  ] = useState(false)

  const releaseTagFormat = useDetectReleaseFormatViaGithubApi(
    firstGithubRepository,
    selectedVersion
  )

  const isQualifiedForShowAllVersions =
    versionInfos.length > NUM_VERSIONS_ON_PAGE_LOAD
  const displayShowAllVersionsButton =
    isQualifiedForShowAllVersions && !triggeredShowAllVersions
  const shownVersions = triggeredShowAllVersions
    ? versionInfos
    : versionInfos.slice(0, NUM_VERSIONS_ON_PAGE_LOAD)

  const isQualifiedForShowAllReverseDependencies =
    reverseDependencies.length > NUM_REVERSE_DEPENDENCIES_ON_PAGE_LOAD
  const displayShowAllReverseDependenciesButton =
    isQualifiedForShowAllReverseDependencies &&
    !triggeredShowAllReverseDependencies
  const shownReverseDependencies = triggeredShowAllReverseDependencies
    ? reverseDependencies
    : reverseDependencies.slice(0, NUM_REVERSE_DEPENDENCIES_ON_PAGE_LOAD)

  const versionInfo = versionInfos.find((n) => n.version === selectedVersion)

  const githubLink = firstGithubRepository?.replace(
    'github:',
    'https://github.com/'
  )
  const releaseNotesLink = buildReleaseNotesLink(
    githubLink,
    selectedVersion,
    releaseTagFormat
  )

  if (!versionInfo) {
    throw Error(
      `Version information for version \`${selectedVersion}\` of module \`${module}\` could not be retrieved`
    )
  }

  return (
    <div className="flex flex-col">
      <Head>
        <title>{`Bazel Central Registry | ${module}`}</title>
        <link rel="icon" href="/favicon.png" />
      </Head>

      <Header />
      <main>
        <div className="max-w-4xl w-4xl mx-auto mt-8">
          <div className="border rounded p-4 divide-y">
            <div>
              <span className="text-3xl">{module}</span>
              <span className="text-lg ml-2">{selectedVersion}</span>
            </div>
            <div className="mt-4 flex flex-wrap sm:divide-x gap-2">
              <div className="basis-0 grow-[999]">
                <h2 className="text-2xl font-bold mt-4">Install</h2>
                <div className="mt-2">
                  <p>
                    To start using this module, make sure you have set up Bzlmod
                    according to the <a href={USER_GUIDE_LINK}>user guide</a>,
                    and add the following to your <code>MODULE.bazel</code>{' '}
                    file:
                  </p>
                  <CopyCode
                    code={`bazel_dep(name = "${module}", version = "${selectedVersion}")`}
                  />
                  {!!releaseNotesLink && (
                    <p>
                      Read the{' '}
                      <a
                        href={releaseNotesLink}
                        className="text-link-color hover:text-link-color-hover"
                      >
                        Release Notes
                      </a>
                    </p>
                  )}
                </div>
                <h2 className="text-2xl font-bold mt-4">Version history</h2>
                <div>
                  <ul className="mt-4">
                    {shownVersions.map((version) => (
                      <>
                        <li
                          key={version.version}
                          className="border rounded mt-2 "
                        >
                          {version.isYanked && (
                            <div
                              key={`${version.version}-yanked`}
                              className="p-2 mb-2 bg-amber-300"
                            >
                              <a
                                href="https://bazel.build/external/module#yanked_versions"
                                className="underline decoration-dashed decoration-gray-500 hover:decoration-black"
                              >
                                Version yanked
                              </a>{' '}
                              with comment: <p>{version.yankReason}</p>
                            </div>
                          )}
                          <div className="flex items-stretch gap-4">
                            <div className="flex flex-1 justify-between">
                              <div className="flex p-2 flex-col gap-2 justify-between border-r hover:border-link-color hover:border-r-4">
                                <Link
                                  href={`/modules/${module}/${version.version}`}
                                >
                                  <div className="place-items-center hover:border-gray-800">
                                    {version.version}
                                  </div>
                                </Link>
                                <div className="self-end text-gray-500">
                                  <a
                                    href="https://bazel.build/external/module#compatibility_level"
                                    className="underline decoration-dashed decoration-gray-500 hover:decoration-black"
                                  >
                                    compatibility level
                                  </a>{' '}
                                  {version.moduleInfo.compatibilityLevel}
                                </div>
                              </div>
                              <div className="flex p-2 justify-end">
                                <div className="flex flex-col justify-between items-end">
                                  <a
                                    href={`https://github.com/bazelbuild/bazel-central-registry/tree/main/modules/${module}/${version.version}`}
                                    className="text-link-color hover:text-link-color-hover"
                                  >
                                    view registry source
                                  </a>
                                  <a
                                    href={`https://github.com/bazelbuild/bazel-central-registry/commit/${version.submission.hash}`}
                                    className="text-link-color hover:text-link-color-hover"
                                    suppressHydrationWarning
                                  >
                                    published{' '}
                                    {formatDistance(
                                      parseISO(
                                        version.submission.authorDateIso
                                      ),
                                      new Date(),
                                      { addSuffix: true }
                                    )}
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      </>
                    ))}
                  </ul>
                  {displayShowAllVersionsButton && (
                    <button
                      className="font-semibold border rounded p-2 mt-4 w-full hover:shadow-lg"
                      onClick={() => setTriggeredShowAllVersions(true)}
                    >
                      Show all {versionInfos.length} versions
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  <h2 className="text-2xl font-bold mt-4">Dependency graph</h2>
                </div>
                <div className="mt-4">
                  <details open>
                    <summary>
                      <span
                        role="heading"
                        aria-level={2}
                        className="text-1xl mt-4"
                      >
                        <span className="font-bold">Direct</span> (
                        {versionInfo.moduleInfo.dependencies.filter(
                          (d) => !d.dev
                        ).length || 'None'}
                        ){' '}
                        <small className="text-sm font-normal text-gray-500">
                          at version {selectedVersion}
                        </small>
                      </span>
                    </summary>
                    <ul className="mt-4">
                      {versionInfo.moduleInfo.dependencies
                        .filter((d) => !d.dev)
                        .map((dependency) => (
                          <Link
                            key={dependency.module}
                            href={`/modules/${dependency.module}/${dependency.version}`}
                          >
                            <li className="border rounded p-2 mt-2 flex items-center gap-4 hover:border-gray-800">
                              <div className="rounded-full border h-14 w-14 grid place-items-center">
                                {dependency.version}
                              </div>
                              <div>{dependency.module}</div>
                            </li>
                          </Link>
                        ))}
                      {versionInfo.moduleInfo.dependencies.filter((d) => !d.dev)
                        .length === 0 && <span>No dependencies</span>}
                    </ul>
                  </details>
                </div>
                <div className="mt-4">
                  <details>
                    <summary>
                      <span
                        role="heading"
                        aria-level={2}
                        className="text-1xl mt-4"
                      >
                        <span className="font-bold">Dev Dependencies</span> (
                        {versionInfo.moduleInfo.dependencies.filter(
                          (d) => d.dev
                        ).length || 'None'}
                        ){' '}
                      </span>
                    </summary>
                    <ul className="mt-4">
                      {versionInfo.moduleInfo.dependencies
                        .filter((d) => d.dev)
                        .map((dependency) => (
                          <Link
                            key={dependency.module}
                            href={`/modules/${dependency.module}/${dependency.version}`}
                          >
                            <li className="border rounded p-2 mt-2 flex items-center gap-4 hover:border-gray-800">
                              <div className="rounded-full border h-14 w-14 grid place-items-center">
                                {dependency.version}
                              </div>
                              <div>{dependency.module}</div>
                            </li>
                          </Link>
                        ))}
                      {versionInfo.moduleInfo.dependencies.length === 0 && (
                        <span>No dependencies</span>
                      )}
                    </ul>
                  </details>
                </div>
                <div className="mt-4">
                  <details>
                    <summary>
                      <span
                        role="heading"
                        aria-level={2}
                        className="text-1xl mt-4"
                      >
                        <span className="font-bold">Dependents</span>{' '}
                        {shownReverseDependencies.length > 0
                          ? `(${shownReverseDependencies.length})`
                          : ''}
                      </span>
                    </summary>
                    <ul className="mt-4">
                      {shownReverseDependencies.map((revDependency) => (
                        <Link
                          key={revDependency}
                          href={`/modules/${revDependency}`}
                        >
                          <li className="border rounded p-2 mt-2 flex items-center gap-4 hover:border-gray-800">
                            <div>{revDependency}</div>
                          </li>
                        </Link>
                      ))}
                      {reverseDependencies.length === 0 && (
                        <span>No dependent modules yet</span>
                      )}
                    </ul>
                    {displayShowAllReverseDependenciesButton && (
                      <button
                        className="font-semibold border rounded p-2 mt-4 w-full hover:shadow-lg"
                        onClick={() =>
                          setTriggeredShowAllReverseDependencies(true)
                        }
                      >
                        Show all {reverseDependencies.length} dependent modules
                      </button>
                    )}
                  </details>
                </div>
              </div>
              <div id="metadata" className="mt-4 sm:pl-2 basis-8 grow">
                <h2 className="text-2xl font-bold mt-4">Metadata</h2>
                <div>
                  <h3 className="font-bold text-xl mt-2">Homepage</h3>
                  <div>
                    <a
                      href={metadata.homepage}
                      className="text-link-color hover:text-link-color-hover"
                    >
                      {metadata.homepage}
                    </a>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl mt-2">Maintainers</h3>
                  <div>
                    <ul>
                      {metadata.maintainers.map(({ name, email, github }) => (
                        <li key={name}>
                          <span>
                            {email && (
                              <a
                                className="text-link-color hover:text-link-color-hover cursor-pointer mr-1"
                                href={`mailto:${email}`}
                              >
                                <FontAwesomeIcon icon={faEnvelope} />
                              </a>
                            )}
                            {github && (
                              <a
                                className="text-link-color hover:text-link-color-hover cursor-pointer mr-1"
                                href={`https://github.com/${github}`}
                              >
                                <FontAwesomeIcon icon={faGithub} />
                              </a>
                            )}
                            {name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="flex-grow" />
      <Footer />
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { module } = params as any

  return await getStaticPropsModulePage(module, null)
}

export async function getStaticPaths() {
  const modulesNames = await listModuleNames()

  const paths = modulesNames.map((name) => ({
    params: { module: name },
  }))

  return {
    paths,
    // TODO: fallback true?
    fallback: false,
  }
}

/**
 * Encodes the format that release tags on the GitHub repository have.
 *
 * Allows us to build correct links to the release notes.
 */
enum ReleaseTagFormat {
  /**
   * Tag `1.2.3` for the version number `1.2.3`.
   */
  NO_PREFIX,
  /**
   * Tag `v1.2.3` for the version number `1.2.3`.
   */
  V_PREFIX,
  /**
   * Other tag format. Can occur if our heuristics can't detect a concrete format.
   */
  UNKNOWN,
}

const buildReleaseNotesLink = (
  githubLink: string | undefined,
  moduleVersion: string,
  releaseTagFormat: ReleaseTagFormat
): string | undefined => {
  if (!githubLink) {
    return undefined
  }

  switch (releaseTagFormat) {
    case ReleaseTagFormat.NO_PREFIX:
      return `${githubLink}/releases/tag/${moduleVersion}`
    case ReleaseTagFormat.V_PREFIX:
      return `${githubLink}/releases/tag/v${moduleVersion}`
    case ReleaseTagFormat.UNKNOWN:
      // If we don't know to format, we'll link to the release search for that module version.
      // For many cases (typo in repo, multiple modules per repo), this is still more desirable than a 404.
      return `${githubLink}/releases?q=${moduleVersion}`
  }
  // @ts-ignore: Unreachable code error
  throw new Error(
    'Unable to generate release notes link due to unknown release tag format. Should be unreachable.'
  )
}

type UseDetectReleaseFormatViaGithubApiReturns = ReleaseTagFormat

/**
 * Hook that detects the applicable `ReleaseTagFormat` for a module by sending 1-2 requests to the Github API from the browser.
 */
const useDetectReleaseFormatViaGithubApi = (
  metadataRepository: string | undefined,
  moduleVersion: string
): UseDetectReleaseFormatViaGithubApiReturns => {
  const githubOwnerAndRepo = metadataRepository?.replace('github:', '')
  // We default to `UNKNOWN`, so that we still have a reasonable default in case that e.g. the API request fails.
  const [releaseTagFormat, setReleaseTagFormat] = useState(
    ReleaseTagFormat.UNKNOWN
  )
  useEffect(() => {
    const detectReleaseFormat = async () => {
      // Don't send any requests if we don't have a repo.
      if (!githubOwnerAndRepo) {
        return
      }
      // First try is with v-prefix, as that is the most common.
      const vPrefixResponse = await fetch(
        `https://api.github.com/repos/${githubOwnerAndRepo}/releases/tags/v${moduleVersion}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Bazel Central Registry UI',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      )
      if (vPrefixResponse.ok) {
        setReleaseTagFormat(ReleaseTagFormat.V_PREFIX)
        return
      }
      // Second try without prefix
      const noPrefixResponse = await fetch(
        `https://api.github.com/repos/${githubOwnerAndRepo}/releases/tags/${moduleVersion}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Bazel Central Registry UI',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      )
      if (noPrefixResponse.ok) {
        setReleaseTagFormat(ReleaseTagFormat.NO_PREFIX)
        return
      }
      // Neither matches -> Leave format as default value.
    }
    detectReleaseFormat()
  }, [githubOwnerAndRepo, moduleVersion])

  return releaseTagFormat
}

export default ModulePage
