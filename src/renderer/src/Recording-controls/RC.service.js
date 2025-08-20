/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { useState } from 'react'
import { useGetLatestRecordings, useGetUser, } from './RC.query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const RCService = () => {
  const navigate = useNavigate()
  const login = localStorage.getItem('token')
   const { data: getLatestRecordings,isLoading: isGetLatestRecordingsLoading, refetch: refetchLatestRecordings } = useGetLatestRecordings()
   const { data: getUser, isLoading: isGetUserLoading, refetch: refetchUser } = useGetUser()



  const [isLoginPage, setIsLoginPage] = useState(true)

  const API_BASE_URL = 'https://api-dev-classcapsule.nfndev.com'

  // Upload recording to S3
  const uploadRecording = async (filePath, buffer, filename) => {
    try {
      const authToken = localStorage.getItem('authToken')
      
      if (!authToken) {
        throw new Error('No authentication token available. Please login first.')
      }

      const fileSize = buffer.length
      const fileSizeMB = fileSize / 1024 / 1024

      console.log('Starting upload process...', {
        filename: filename,
        fileSizeMB: fileSizeMB.toFixed(2),
        bufferSize: fileSize
      })

      if (fileSizeMB < 10) {
        // Small file - use regular upload
        console.log('Using regular upload for small file')
        return await uploadSmallFile(buffer, filename, authToken)
      } else {
        // Large file - use multipart upload
        console.log('Using multipart upload for large file')
        return await uploadLargeFile(buffer, filename, authToken)
      }
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }
  }

  // Upload small file (< 10MB)
  const uploadSmallFile = async (buffer, filename, authToken) => {
    try {
      // Create FormData
      const formData = new FormData()
      const blob = new Blob([buffer], { type: 'video/webm' })
      formData.append('file', blob, filename)

      const response = await axios.post(`${API_BASE_URL}/recordings/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000 // 2 minute timeout
      })

      console.log('Small file upload successful:', response.data)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Small file upload error:', error)
      throw error
    }
  }

  // Upload large file using multipart upload (≥ 10MB)
  const uploadLargeFile = async (buffer, filename, authToken) => {
    try {
      const fileSize = buffer.length

      // Start multipart upload
      const startResponse = await axios.post(
        `${API_BASE_URL}/recordings/start-multipart-upload`,
        {
          fileName: filename,
          fileSize: fileSize,
          contentType: 'video/webm'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const { uploadId } = startResponse.data
      console.log('UploadId:', uploadId)

      // Generate presigned URLs
      const presignedResponse = await axios.post(
        `${API_BASE_URL}/recordings/generate-presigned-url`,
        {
          fileName: filename,
          uploadId: uploadId,
          fileSize: fileSize
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const presignedUrls = presignedResponse.data.presignedUrls
      console.log('Presigned URLs count:', presignedUrls.length)

      // Upload parts with retry logic
      const parts = []
      const chunkSize = Math.ceil(fileSize / presignedUrls.length)
      console.log(`File size: ${fileSize}, Chunk size: ${chunkSize}, Parts: ${presignedUrls.length}`)

      for (let i = 0; i < presignedUrls.length; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, fileSize)
        const chunk = buffer.slice(start, end)
        const presignedUrl = presignedUrls[i]

        // Upload part with retry logic
        const partResult = await uploadPartWithRetry(presignedUrl, chunk, 'video/webm', i + 1)
        
        parts.push({
          etag: partResult.etag,
          PartNumber: i + 1
        })

        console.log(`Part ${i + 1} uploaded successfully`)
      }

      // Sort parts by PartNumber to ensure correct order
      parts.sort((a, b) => a.PartNumber - b.PartNumber)

      // Complete multipart upload
      const completeResponse = await axios.post(
        `${API_BASE_URL}/recordings/complete-multipart-upload`,
        {
          fileName: filename,
          uploadId: uploadId,
          parts: parts
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 1 minute timeout for completion
        }
      )

      console.log('Multipart upload completed:', completeResponse.data)
      return { success: true, data: completeResponse.data }
      
    } catch (error) {
      console.error('Large file upload error:', error)
      throw error
    }
  }

  // Upload part with retry logic
  const uploadPartWithRetry = async (presignedUrl, chunk, contentType, partNumber, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.put(presignedUrl, chunk, {
          headers: {
            'Content-Type': contentType
          },
          timeout: 300000 // 5 minutes timeout for large parts
        })

        const etag = response.headers.etag
        if (!etag) {
          throw new Error(`Missing ETag for part ${partNumber}`)
        }

        console.log(`Part ${partNumber} uploaded successfully`)
        return { success: true, etag: etag.replace(/"/g, '') }
        
      } catch (error) {
        console.error(`Error uploading part ${partNumber} (attempt ${attempt}/${maxRetries}):`, error.message)
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to upload part ${partNumber} after ${maxRetries} attempts`)
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

   async function getAudioVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
    const videoInputs = devices.filter((d) => d.kind === "videoinput");

    console.log(audioInputs, audioOutputs, videoInputs)
    return { audioInputs, audioOutputs, videoInputs };
  }

  return {
    // GetUserData,
    // isGetUserDataLoading,
    // refetchUserData,
    isLoginPage,
    setIsLoginPage,
    uploadRecording,
    getAudioVideoDevices,
    getLatestRecordings,
    isGetLatestRecordingsLoading,
    refetchLatestRecordings,
    getUser,
    refetchUser
  }
}

export default RCService
