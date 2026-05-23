import { gql } from "@apollo/client";

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      admin {
        id
        email
        displayName
        organization
        clientId
        tenantId
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      admin {
        id
        email
        displayName
        organization
        clientId
        tenantId
      }
    }
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      email
      displayName
      organization
      clientId
      tenantId
    }
  }
`;

export const GET_TENANT_USERS = gql`
  query GetTenantUsers {
    tenantUsers {
      azureId
      displayName
      email
      userPrincipalName
      jobTitle
      department
      accountEnabled
      fetchedAt
      fileCount
    }
  }
`;

export const GET_TENANT_USER_FILES = gql`
  query GetTenantUserFiles($userId: String!) {
    tenantUserFiles(userId: $userId) {
      id
      graphItemId
      name
      path
      size
      mimeType
      lastModified
      s3Key
      uploadStatus
      uploadError
    }
  }
`;

export const GET_ADMIN_JOBS = gql`
  query GetAdminJobs {
    adminJobs {
      id
      type
      status
      triggeredBy
      adminDisplayName
      totalUsers
      processedUsers
      totalFiles
      processedFiles
      failedFiles
      currentUser
      currentFile
      error
      startedAt
      completedAt
      createdAt
    }
  }
`;

export const GET_ADMIN_JOB = gql`
  query GetAdminJob($jobId: String!) {
    adminJob(jobId: $jobId) {
      id
      type
      status
      triggeredBy
      adminDisplayName
      totalUsers
      processedUsers
      totalFiles
      processedFiles
      failedFiles
      currentUser
      currentFile
      error
      startedAt
      completedAt
      createdAt
    }
  }
`;

export const START_FETCH_JOB = gql`
  mutation StartFetchJob {
    startFetchJob {
      jobId
      message
    }
  }
`;

export const START_UPLOAD_JOB = gql`
  mutation StartUploadJob {
    startUploadJob {
      jobId
      message
    }
  }
`;

export const INVALIDATE_CACHE = gql`
  mutation InvalidateCache {
    invalidateCache
  }
`;
