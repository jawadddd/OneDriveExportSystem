const typeDefs = `#graphql
  type Admin {
    id: String!
    email: String!
    displayName: String!
    organization: String
    clientId: String!
    tenantId: String!
    createdAt: String
  }

  type AuthResult {
    token: String!
    admin: Admin!
  }

  input RegisterInput {
    email: String!
    password: String!
    displayName: String!
    organization: String
    clientId: String!
    clientSecret: String!
    tenantId: String!
  }

  type TenantUser {
    azureId: String!
    displayName: String
    email: String
    userPrincipalName: String
    jobTitle: String
    department: String
    accountEnabled: Boolean
    fetchedAt: String
    fileCount: Int
  }

  type DriveFile {
    id: String!
    graphItemId: String!
    userId: String!
    userEmail: String
    name: String
    path: String
    size: Int
    mimeType: String
    lastModified: String
    s3Key: String
    uploadStatus: String
    uploadError: String
  }

  type ExportJob {
    id: String!
    type: String!
    status: String!
    triggeredBy: String
    adminDisplayName: String
    totalUsers: Int
    processedUsers: Int
    totalFiles: Int
    processedFiles: Int
    failedFiles: Int
    currentUser: String
    currentFile: String
    error: String
    startedAt: String
    completedAt: String
    createdAt: String
  }

  type JobStartResult {
    jobId: String!
    message: String!
  }

  type Query {
    me: Admin
    tenantUsers: [TenantUser!]!
    tenantUserFiles(userId: String!): [DriveFile!]!
    adminJobs: [ExportJob!]!
    adminJob(jobId: String!): ExportJob
  }

  type Mutation {
    register(input: RegisterInput!): AuthResult!
    login(email: String!, password: String!): AuthResult!
    startFetchJob: JobStartResult!
    startUploadJob: JobStartResult!
    invalidateCache: Boolean!
  }
`;

module.exports = typeDefs;
