def withNodeTool(Closure body) {
    def nodeHome = tool(name: params.JENKINS_NODEJS_TOOL, type: 'nodejs')
    if (isUnix()) {
        withEnv(["PATH+NODE=${nodeHome}/bin"]) {
            body()
        }
    } else {
        withEnv(["PATH+NODE=${nodeHome}"]) {
            body()
        }
    }
}

def verifyNodeVersion() {
    def versionOutput
    if (isUnix()) {
        versionOutput = sh(returnStdout: true, script: 'node --version').trim()
    } else {
        versionOutput = bat(returnStdout: true, script: '@echo off\r\nnode --version').trim()
    }

    def match = (versionOutput =~ /v?(\d+)\.(\d+)\.(\d+)/)
    if (!match) {
        error("Unable to parse Node.js version output: ${versionOutput}")
    }

    int major = match[0][1] as int
    int minor = match[0][2] as int
    boolean supported = (major == 20 && minor >= 19) || (major == 22 && minor >= 12) || (major >= 24)

    if (!supported) {
        error("Unsupported Node.js version ${versionOutput}. Prisma requires 20.19+, 22.12+, or 24.0+.")
    }
}

def withCiEnvironment(Closure body) {
    def sharedEnv = [
        'CI=true',
        'NODE_ENV=test',
        'FRONTEND_URL=http://localhost:5173',
        'VITE_API_URL=http://localhost:5000/api',
        'JWT_ACCESS_EXPIRY=15m',
        'JWT_REFRESH_EXPIRY=7d',
    ]

    if (params.USE_JENKINS_CREDENTIALS) {
        def databaseId = params.DATABASE_URL_CREDENTIAL_ID?.trim()
        def accessSecretId = params.JWT_ACCESS_SECRET_CREDENTIAL_ID?.trim()
        def refreshSecretId = params.JWT_REFRESH_SECRET_CREDENTIAL_ID?.trim()

        if (!databaseId || !accessSecretId || !refreshSecretId) {
            error('Credential IDs are required when USE_JENKINS_CREDENTIALS is enabled.')
        }

        withCredentials([
            string(credentialsId: databaseId, variable: 'DATABASE_URL'),
            string(credentialsId: accessSecretId, variable: 'JWT_ACCESS_SECRET'),
            string(credentialsId: refreshSecretId, variable: 'JWT_REFRESH_SECRET'),
        ]) {
            withEnv(sharedEnv) {
                body()
            }
        }
        return
    }

    // Local fallback for quick CI smoke runs when Jenkins credentials are not configured.
    withEnv(sharedEnv + [
        'DATABASE_URL=postgresql://ci_user:ci_password@localhost:5432/aegismesh_ci',
        'JWT_ACCESS_SECRET=ci-access-secret',
        'JWT_REFRESH_SECRET=ci-refresh-secret',
    ]) {
        body()
    }
}

def installNodeDependencies() {
    withNodeTool {
    if (fileExists('package-lock.json') || fileExists('npm-shrinkwrap.json')) {
        if (isUnix()) {
            sh 'npm ci --no-audit --no-fund'
        } else {
            bat 'call npm ci --no-audit --no-fund'
        }
    } else {
        if (isUnix()) {
            sh 'npm install --no-audit --no-fund'
        } else {
            bat 'call npm install --no-audit --no-fund'
        }
    }
    }
}

def runNpmScript(String scriptName) {
    withNodeTool {
        if (isUnix()) {
            sh "npm run ${scriptName}"
        } else {
            bat "call npm run ${scriptName}"
        }
    }
}

def buildDockerImage(String contextDir, String imageName, String imageTag) {
    def cmd = "docker build -t ${imageName}:${imageTag} ${contextDir}"
    if (isUnix()) {
        sh cmd
    } else {
        bat cmd
    }
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(daysToKeepStr: '14', numToKeepStr: '30'))
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        booleanParam(name: 'RUN_DOCKER_BUILD', defaultValue: false, description: 'Build Docker images after tests pass')
        booleanParam(name: 'RUN_FRONTEND_LINT', defaultValue: true, description: 'Run frontend lint stage')
        booleanParam(name: 'FAIL_ON_LINT', defaultValue: false, description: 'Fail build if frontend lint reports errors')
        booleanParam(name: 'USE_JENKINS_CREDENTIALS', defaultValue: true, description: 'Use Jenkins credentials for backend secrets')
        string(name: 'DATABASE_URL_CREDENTIAL_ID', defaultValue: 'aegismesh-database-url', description: 'Credential ID for DATABASE_URL (Secret text)')
        string(name: 'JWT_ACCESS_SECRET_CREDENTIAL_ID', defaultValue: 'aegismesh-jwt-access-secret', description: 'Credential ID for JWT_ACCESS_SECRET (Secret text)')
        string(name: 'JWT_REFRESH_SECRET_CREDENTIAL_ID', defaultValue: 'aegismesh-jwt-refresh-secret', description: 'Credential ID for JWT_REFRESH_SECRET (Secret text)')
        string(name: 'BACKEND_IMAGE', defaultValue: 'aegismesh/backend', description: 'Backend Docker image name')
        string(name: 'FRONTEND_IMAGE', defaultValue: 'aegismesh/frontend', description: 'Frontend Docker image name')
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag')
        string(name: 'JENKINS_NODEJS_TOOL', defaultValue: 'NodeJS_22_12', description: 'Name of configured Jenkins NodeJS tool installation')
    }

    environment {
        CI = 'true'
        NODE_ENV = 'test'
        FRONTEND_URL = 'http://localhost:5173'
        VITE_API_URL = 'http://localhost:5000/api'
        JWT_ACCESS_EXPIRY = '15m'
        JWT_REFRESH_EXPIRY = '7d'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Node Toolchain Check') {
            steps {
                script {
                    withNodeTool {
                        if (isUnix()) {
                            sh 'node --version && npm --version'
                        } else {
                            bat 'call node --version && call npm --version'
                        }
                        verifyNodeVersion()
                    }
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Deps') {
                    steps {
                        dir('backend') {
                            script {
                                installNodeDependencies()
                            }
                        }
                    }
                }

                stage('Frontend Deps') {
                    steps {
                        dir('frontend') {
                            script {
                                installNodeDependencies()
                            }
                        }
                    }
                }
            }
        }

        stage('Validate and Build') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            script {
                                withCiEnvironment {
                                    runNpmScript('test')
                                }
                            }
                        }
                    }
                }

                stage('Frontend Lint') {
                    when {
                        expression {
                            return params.RUN_FRONTEND_LINT
                        }
                    }
                    steps {
                        dir('frontend') {
                            script {
                                if (params.FAIL_ON_LINT) {
                                    runNpmScript('lint')
                                } else {
                                    catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                                        runNpmScript('lint')
                                    }
                                }
                            }
                        }
                    }
                }

                stage('Frontend Build') {
                    steps {
                        dir('frontend') {
                            script {
                                runNpmScript('build')
                            }
                        }
                    }
                }
            }
        }

        stage('Docker Build (Optional)') {
            when {
                expression {
                    return params.RUN_DOCKER_BUILD
                }
            }
            steps {
                script {
                    buildDockerImage('./backend', params.BACKEND_IMAGE, params.IMAGE_TAG)
                    buildDockerImage('./frontend', params.FRONTEND_IMAGE, params.IMAGE_TAG)
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'frontend/dist/**', allowEmptyArchive: true, fingerprint: true
        }
    }
}
