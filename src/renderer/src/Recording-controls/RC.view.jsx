import { useNavigate } from 'react-router-dom'
import { useDebugValue, useEffect, useState, useCallback } from 'react'
import { Play, Mic, ExternalLink, MessageSquare, CircleMinus, StopCircle, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
  import { Switch } from '@/components/ui/switch'
  import { IoIosMicrophone } from 'react-icons/io'
import { BsFillPlayBtnFill, BsPlayBtn } from 'react-icons/bs'
import { RiCloseCircleFill } from 'react-icons/ri'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Header } from '@/components/Header'
import RecordingCard from '@/components/RecordingCard'
import { MeetingCard } from '@/components/MeetingCard'
import Carousel from '@/components/Carousel'
import SourceSelector from '@/components/SourceSelector'
import { useScreenRecorder } from '@/hooks/useScreenRecorder'
import microphoneIcon from '@/assets/mic.svg'
import whiteMicrophoneIcon from '@/assets/mic_white.svg'
import RCService from './RC.service'
import dayjs from 'dayjs'
import { Skeleton } from '@/components/ui/skeleton'

const RCView = ({ setAuthToken, setIsMicMuted }) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    //window.electron.store.delete('authToken');
    localStorage.removeItem('authToken')
    setAuthToken(null)
    navigate('/login')
  }

  return (
    <div className="w-full h-full ">
      <View handleLogout={handleLogout} setIsMicMuted={setIsMicMuted} />
    </div>
  )
}

export default RCView

  const View = ({ handleLogout, setIsMicMuted }) => {
  const [selectedMode, setSelectedMode] = useState('screen')
  const [systemAudio, setSystemAudio] = useState(true)
  const [isMacOS, setIsMacOS] = useState(false)
  // const [isRecordingStarted, setIsRecordingStarted] = useState(false)
  const [Microphone, setMicrophone] = useState('disabled')
  const [audioInputs, setAudioInputs] = useState([])
  const [selectedScreenSource, setSelectedScreenSource] = useState('')

  const [latestRecordings, setLatestRecordings] = useState([])

  const {
    getAudioVideoDevices,
    getLatestRecordings,
    isGetLatestRecordingsLoading,
    refetchLatestRecordings,
    getUser,
    refetchUser
  } = RCService()
  // Helper function to determine recording status
  const getRecordingStatus = useCallback((recording) => {
    if (recording?.fileStatus !== 'COMPLETED') return 'Uploading'

    if (
      recording?.fileStatus === 'FAILED' ||
      recording?.summaryStatus === 'FAILED' ||
      recording?.transcriptionStatus === 'FAILED'
    )
      return 'Failed'
    if (recording?.summaryStatus !== 'COMPLETED' || recording?.transcriptionStatus !== 'COMPLETED')
      return 'Processing'
    return 'Available'
  }, [])

  // Helper function to check if recording needs frequent updates
  const needsFrequentUpdates = useCallback((recording) => {
    return (
      recording?.fileStatus !== 'COMPLETED' ||
      recording?.summaryStatus !== 'COMPLETED' ||
      recording?.transcriptionStatus !== 'COMPLETED'
    )
  }, [])

  useEffect(() => {
    setLatestRecordings(getLatestRecordings?.data?.recordings)
  }, [getLatestRecordings?.data?.recordings])

  useEffect(() => {
    refetchUser();
    setIsMacOS(navigator.userAgent.toLowerCase().includes('mac'))
  }, [])

  useEffect(() => {
    localStorage.getItem('selectedMode')
      ? setSelectedMode(localStorage.getItem('selectedMode'))
      : setSelectedMode('screen')
    
    // Load saved screen source
    const savedScreenSource = localStorage.getItem('selectedScreenSource')
    if (savedScreenSource) {
      setSelectedScreenSource(savedScreenSource)
    }
    
    // Load audio devices
    const loadAudioDevices = async () => {
      try {
        const devices = await getAudioVideoDevices()
        setAudioInputs(devices.audioInputs || [])
      } catch (error) {
        console.error('Error loading audio devices:', error)
      }
    }

    loadAudioDevices()
  }, [])

  useEffect(() => {
    localStorage.getItem('Microphone') &&
    (audioInputs.some((item) => item.label === localStorage.getItem('Microphone')) ||
      localStorage.getItem('Microphone') === 'disabled')
      ? setMicrophone(localStorage.getItem('Microphone'))
      : setMicrophone(audioInputs[0]?.label || 'disabled')
  }, [audioInputs])

  // Notify main process when microphone selection changes
  useEffect(() => {
    if (window.api && window.api.updateMicrophoneEnabled) {
      const isEnabled = Microphone !== 'disabled' && localStorage.getItem('Microphone') !== 'disabled';
      window.api.updateMicrophoneEnabled(isEnabled);
    }
  }, [Microphone]);

  const { startRecording, stopRecording, isRecording, isUploading, isMicMuted } = useScreenRecorder({
    micEnabled: Microphone !== 'disabled',
    systemAudioEnabled: systemAudio,
    audioOnly: selectedMode === 'audio',
    selectedScreenSource: selectedScreenSource
  })

  // Sync microphone state with parent component
  useEffect(() => {
    if (setIsMicMuted) {
      setIsMicMuted(isMicMuted);
    }
  }, [isMicMuted, setIsMicMuted]);

  // Logic for start recording and external overlay
  useEffect(() => {
    if (isRecording) {
      // Show external overlay
      if (window.api && window.api.showRecordingOverlay) {
        window.api?.minimizeWindow()
        window.api.showRecordingOverlay()
      }
    } else {
      // Hide external overlay
      if (window.api && window.api.hideRecordingOverlay) {
        window.api.hideRecordingOverlay()
      }
    }
  }, [isRecording])

  // Handle stop recording from external overlay
  useEffect(() => {
    if (window.api && window.api.onStopRecordingFromOverlay) {
      window.api.onStopRecordingFromOverlay(() => {
        stopRecording()
      })
    }
  }, [])

  useEffect(() => {
    const baseTimer = setInterval(() => {
      refetchLatestRecordings()
    }, 3000)


    return () => {
      clearInterval(baseTimer)
    }
  }, [latestRecordings, refetchLatestRecordings, needsFrequentUpdates])

  return (
    <div className="min-h-screen bg-background">
      <div
        className={`w-full h-[45px] bg-black text-white flex items-center justify-end px-4 ${isMacOS ? 'justify-start' : 'justify-end'}`}
        style={{ WebkitAppRegion: 'drag' }}
      >
        {/* macOS-style window controls (left side) */}
        {isMacOS && (
          <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={() => window.api?.closeWindow()}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 flex items-center justify-center group shadow-sm hover:shadow-md"
              title="Close"
            >
              <div className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
            <button
              onClick={() => window.api?.minimizeWindow()}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-all duration-200 flex items-center justify-center group shadow-sm hover:shadow-md"
              title="Minimize"
            >
              <div className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        )}

        {/* Windows-style window controls (right side) */}
        {!isMacOS && (
          <div style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={() => window.api?.minimizeWindow()}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Minimize"
            >
              <CircleMinus className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.api?.closeWindow()}
              className="p-1 mb-0.5 hover:bg-red-800 rounded transition-colors ml-1 mt-1"
              title="Close"
            >
              <RiCloseCircleFill className="w-[22px] h-[22px] " />
            </button>
          </div>
        )}
      </div>
      <div className="max-w-md mx-auto bg-card">
        <Header handleLogout={handleLogout} userData={getUser?.data} />

        <div className="p-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <RecordingCard
              title="Screen + Audio"
              icon={<BsFillPlayBtnFill className="w-6 h-6" />}
              isSelected={selectedMode === 'screen'}
              onClick={() => {
                setSelectedMode('screen')
                localStorage.setItem('selectedMode', 'screen')
              }}
            />
            <RecordingCard
              title="Only Audio"
              icon={<img src={microphoneIcon} alt="microphone" className="w-6 h-6" />}
              isSelected={selectedMode === 'audio'}
              onClick={() => {
                setSelectedMode('audio')
                localStorage.setItem('selectedMode', 'audio')
              }}
            />
          </div>
       
       <div className=' flex items-center justify-between w-full h-full gap-2'>

          {/* Microphone Selection */}
          <div className={`border border-solid ${selectedMode === 'screen' ? 'w-1/2' : 'w-full'} border-[#E5E5E5] px-4 pt-2 pb-1 rounded-md`}>
            <label className="text-sm font-medium text-foreground">Microphone</label>
            <Select
              value={Microphone}
              onValueChange={(value) => {
                localStorage.setItem('Microphone', value)
                setMicrophone(value)
              }}
            >
              <SelectTrigger className="w-full border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 -mt-2 text-xs focus-visible:ring-0 focus-visible:outline-none ">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="-mt-2">
                <SelectItem value="disabled" className="text-xs">
                  Disable microphone
                </SelectItem>

                {audioInputs && audioInputs.length > 0 ? (
                  audioInputs?.map((item, index) => (
                    <SelectItem
                      key={item?.deviceId || index}
                      value={item?.label}
                      className="text-xs"
                    >
                      {item?.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-devices" disabled>
                    No microphones found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Screen Source Selection - Only show for screen recording mode */}
          {selectedMode === 'screen' && (
            <SourceSelector
              selectedSource={selectedScreenSource}
              onSourceChange={(sourceId) => {
                setSelectedScreenSource(sourceId)
                localStorage.setItem('selectedScreenSource', sourceId)
              }}
              disabled={isRecording}
            />
          )}

          </div>

          {/* System Audio Toggle */}
          <div className="flex items-center -mt-2 justify-between border border-solid border-[#E5E5E5] px-4 py-3 rounded-md">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">System audio</h3>
              <p className="text-xs text-muted-foreground">
                Record audio from applications and system sounds
              </p>
            </div>
            <Switch checked={systemAudio} onCheckedChange={setSystemAudio} />
          </div>

          {/* Start Recording Button */}
          <Button
            className={`w-full flex justify-center items-center h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 cursor-pointer ${
              isRecording ? 'bg-red-600 hover:bg-red-700' : ''
            }`}
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            disabled={selectedMode === 'screen' && !selectedScreenSource && !isRecording}
          >
            {isRecording ? (
              <StopCircle className="size-5 mr-2" />
            ) : selectedMode === 'screen' ? (
              <BsPlayBtn className="size-4.5 mr-1  text-white" />
            ) : (
              <img src={whiteMicrophoneIcon} alt="microphone" className="w-4 h-4 text-white mr-1" />
            )}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>

          {/* Help text for screen source selection */}
          {selectedMode === 'screen' && !selectedScreenSource && !isRecording && (
            <div className="text-center -mt-2 mb-1">
              <p className="text-[10px] text-muted-foreground">
                Please select a screen source to start recording
              </p>
            </div>
          )}

          {/* Upload Status */}
          {isUploading && (
            <div className="text-center -mt-4 mb-1">
              <p className="text-[10px] text-muted-foreground">
                Uploading previous recording...You can start a new recording anytime!
              </p>
            </div>
          )}

          {/* Latest Meeting */}
          {/* <div className=" w-full overflow-x-auto flex gap-3 items-center ">
            <MeetingCard title="Latest recording" time="Product team catchup • 3:35pm" status="Available" failed={false} />
          </div> */}

          {!localStorage.getItem('latestRecordedData') &&
            latestRecordings?.length === 0 &&
            !isGetLatestRecordingsLoading && (
              <div className=" w-full overflow-x-auto flex gap-3 items-center ">
                <MeetingCard
                  isSingleCard={true}
                  title="Latest recording"
                  time="Start a recording to see your recent meetings here."
                  isEmpty={true}
                />
              </div>
            )}

          {isGetLatestRecordingsLoading && (
            <Skeleton animation="wave" className="w-full h-[60px] border border-gray-300" />
          )}

          {!isGetLatestRecordingsLoading &&
            !localStorage.getItem('latestRecordedData') &&
            latestRecordings?.length > 0 &&
            (latestRecordings?.length > 1 ? (
              <Carousel className="w-full">
                {latestRecordings?.map((item, index) => (
                  <MeetingCard
                    key={index}
                    title={index === 0 ? 'Last recording' : 'Previous recording'}
                    time={
                      <div className="flex items-center gap-1">
                        <span className="inline-block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                          {item?.filename}
                        </span>{' '}
                        {' • '}
                        {dayjs(item?.createdAt).format('hh:mm A')}
                      </div>
                    }
                    status={getRecordingStatus(item)}
                    failed={item?.fileStatus === 'FAILED'}
                  />
                ))}
              </Carousel>
            ) : (
              <div className=" w-full overflow-x-auto flex gap-3 items-center ">
                <MeetingCard
                  isSingleCard={true}
                  title="Last recording"
                  time={
                    <div className="flex items-center gap-1">
                      <span className="inline-block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {latestRecordings?.[0]?.filename}
                      </span>{' '}
                      {' • '}
                      {dayjs(latestRecordings?.[0]?.createdAt).format('hh:mm A')}
                    </div>
                  }
                  status={getRecordingStatus(latestRecordings?.[0])}
                  failed={latestRecordings?.[0]?.fileStatus === 'FAILED'}
                />
              </div>
            ))}

          {localStorage.getItem('latestRecordedData') && (
            <div className=" w-full overflow-x-auto flex gap-3 items-center ">
              <MeetingCard
                isSingleCard={true}
                title="Last recording"
                time={
                  <div className="flex items-center gap-1">
                    <span className="inline-block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {JSON.parse(localStorage.getItem('latestRecordedData'))?.filename}
                    </span>{' '}
                    {' • '}
                    {dayjs(JSON.parse(localStorage.getItem('latestRecordedData'))?.startTime).format(
                      'hh:mm A'
                    )}
                  </div>
                }
                status="Failed to upload"
                failed={true}
              />
            </div>
          )}

          {/* Footer Links */}
          <div className="flex items-center justify-center space-x-6">
            <button
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              onClick={async () => {
                try {
                  // Web app URL - you can change this to your actual web app URL
                  const webAppUrl = 'https://class-capsule-demo.netlify.app/'
                  await window.api.openExternalUrl(webAppUrl)
                } catch (error) {
                  console.error('Error opening web app:', error)
                }
              }}
            >
              <ExternalLink className="w-4 h-4" />
              <span>View all meetings</span>
            </button>
            <button className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Share feedback</span>
            </button>
          </div>

          {/* Made by */}
          <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2">
            <p className="text-xs text-center text-gray-400">Made by NFN Labs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
