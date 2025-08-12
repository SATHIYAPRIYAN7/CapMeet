import { useNavigate } from 'react-router-dom'
import { useDebugValue, useEffect, useState, useCallback } from 'react'
import { Play, Mic, ExternalLink, MessageSquare, CircleMinus, StopCircle } from 'lucide-react'
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
import { useScreenRecorder } from '@/hooks/useScreenRecorder'
import microphoneIcon from '@/assets/mic.svg'
import whiteMicrophoneIcon from '@/assets/mic_white.svg'
import RCService from './RC.service'
import dayjs from 'dayjs'
import { Skeleton } from '@/components/ui/skeleton'

const RCView = ({ setAuthToken }) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setAuthToken(null)
    navigate('/login')
  }

  return (
    <div className="w-full h-full ">
      <View handleLogout={handleLogout} />
    </div>
  )
}

export default RCView

const View = ({ handleLogout }) => {
  const [selectedMode, setSelectedMode] = useState('screen')
  const [systemAudio, setSystemAudio] = useState(true)
  const [isMacOS, setIsMacOS] = useState(false)
  // const [isRecordingStarted, setIsRecordingStarted] = useState(false)
  const [Microphone, setMicrophone] = useState('disabled')
  const [audioInputs, setAudioInputs] = useState([])

  const [latestRecordings, setLatestRecordings] = useState([])

  const { getAudioVideoDevices, getLatestRecordings, isGetLatestRecordingsLoading, refetchLatestRecordings } = RCService()

  // Helper function to determine recording status
  const getRecordingStatus = useCallback((recording) => {
    if (recording?.fileStatus !== "COMPLETED") return "Uploading";
    
    if(recording?.fileStatus === "FAILED" || recording?.summaryStatus === "FAILED" || recording?.transcriptionStatus === "FAILED") return "Failed";
    if (recording?.summaryStatus !== "COMPLETED" || recording?.transcriptionStatus !== "COMPLETED") return "Processing";
    return "Available";
  }, []);

  // Helper function to check if recording needs frequent updates
  const needsFrequentUpdates = useCallback((recording) => {
    return recording?.fileStatus !== "COMPLETED" || 
           recording?.summaryStatus !== "COMPLETED" || 
           recording?.transcriptionStatus !== "COMPLETED";
  }, []);

  useEffect(()=>{
    console.log(getLatestRecordings?.data?.recordings)
    setLatestRecordings(getLatestRecordings?.data?.recordings)
  },[getLatestRecordings?.data?.recordings])

  useEffect(() => {
    // Check if running on macOS
    setIsMacOS(navigator.userAgent.toLowerCase().includes('mac'))
  }, [])

  useEffect(() => {
    localStorage.getItem('selectedMode')
      ? setSelectedMode(localStorage.getItem('selectedMode'))
      : setSelectedMode('screen')
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

  useEffect(()=>{
    localStorage.getItem('Microphone') && (audioInputs.some(item => item.label === localStorage.getItem('Microphone')) || localStorage.getItem('Microphone') === 'disabled')
    ? setMicrophone(localStorage.getItem('Microphone'))
    : setMicrophone(audioInputs[0]?.label || 'disabled')
  },[audioInputs])

  const { startRecording, stopRecording, isRecording, isUploading } = useScreenRecorder({
    micEnabled: Microphone !== "disabled",
    systemAudioEnabled: systemAudio,
    audioOnly: selectedMode === 'audio'
  });

  // Logic for start recording and external overlay
  useEffect(() => {
    if (isRecording) {
      // Show external overlay
      if (window.api && window.api.showRecordingOverlay) {
        window.api.showRecordingOverlay();
      }
    } else {
      // Hide external overlay
      if (window.api && window.api.hideRecordingOverlay) {
        window.api.hideRecordingOverlay();
      }
    }
  }, [isRecording]);

  // Handle stop recording from external overlay
  useEffect(() => {
    if (window.api && window.api.onStopRecordingFromOverlay) {
      window.api.onStopRecordingFromOverlay(() => {
        stopRecording();
      });
    }
  }, []);

  useEffect(() => {
    const baseTimer = setInterval(() => {
      refetchLatestRecordings()
    }, 5000)

    const fastTimer = setInterval(() => {
      if (latestRecordings?.some(needsFrequentUpdates)) {
        refetchLatestRecordings()
      }
    }, 2000) 

    return () => {
      clearInterval(baseTimer)
      clearInterval(fastTimer)
    }
  }, [latestRecordings, refetchLatestRecordings, needsFrequentUpdates])

  return (
    <div className="min-h-screen bg-background">
      <div
        className="w-full h-[45px] bg-black text-white flex items-center justify-end px-4"
        style={{ WebkitAppRegion: 'drag' }}
      >
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
        <Header handleLogout={handleLogout} />

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

          {/* Microphone Selection */}
          <div className="border border-solid border-[#E5E5E5] px-4 pt-2 pb-1 rounded-md">
            <label className="text-sm font-medium text-foreground">Microphone</label>
            <Select value={Microphone} onValueChange={(value) => {
              localStorage.setItem('Microphone', value)
              setMicrophone(value)
            }}>
              <SelectTrigger className="w-full border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 -mt-2 text-xs focus-visible:ring-0 focus-visible:outline-none ">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="-mt-2">
                <SelectItem value="disabled" className="text-xs">Disable microphone</SelectItem>

                {audioInputs && audioInputs.length > 0 ? (
                  audioInputs?.map((item, index) => (
                    <SelectItem key={item?.deviceId || index} value={item?.label} className="text-xs">
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
            className={`w-full flex justify-center items-center h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 cursor-pointer ${isRecording ? 'bg-red-600 hover:bg-red-700' : ''}`}
            onClick={() => isRecording ? stopRecording() : startRecording()}
          >
            {isRecording ? (
              <StopCircle className="size-5 mr-2"  />
            ) : (
             selectedMode === 'screen' ? <BsPlayBtn className="size-4.5 mr-1  text-white"  /> : <img src={whiteMicrophoneIcon} alt="microphone" className="w-4 h-4 text-white mr-1" />
            )}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>

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

          {
            !localStorage.getItem('latestRecordedData') && latestRecordings?.length === 0 && !isGetLatestRecordingsLoading && (
              <div className=" w-full overflow-x-auto flex gap-3 items-center ">
            <MeetingCard isSingleCard ={true} title="Latest recording" time="Start a recording to see your recent meetings here."  />
          </div>
            )
          }

          {
            isGetLatestRecordingsLoading &&
                <Skeleton animation="wave" className='w-full h-[60px] border border-gray-300' />
          }

            { !isGetLatestRecordingsLoading && !localStorage.getItem('latestRecordedData') && latestRecordings?.length > 0 &&
            (latestRecordings?.length > 1 ?
            <Carousel className="w-full">
              {
                latestRecordings?.map((item,index)=>(
                  <MeetingCard 
                    key={index} 
                    title={item?.filename} 
                    time={dayjs(item?.createdAt).format('hh:mm A')} 
                    status={getRecordingStatus(item)}
                    failed={item?.fileStatus === "FAILED"} 
                  />
                ))  
              }
              </Carousel> :
              (
            <div className=" w-full overflow-x-auto flex gap-3 items-center ">
            <MeetingCard isSingleCard ={true} title={latestRecordings?.[0]?.filename} time={dayjs(latestRecordings?.[0]?.createdAt).format('hh:mm A')} status={getRecordingStatus(latestRecordings?.[0])} failed={latestRecordings?.[0]?.fileStatus === "FAILED"} />
          </div>
              ))
          }

          {
            localStorage.getItem('latestRecordedData') &&
            (
              <div className=" w-full overflow-x-auto flex gap-3 items-center ">
                <MeetingCard isSingleCard ={true} title={JSON.parse(localStorage.getItem('latestRecordedData'))?.filename} time={dayjs(JSON.parse(localStorage.getItem('latestRecordedData'))?.startTime).format('hh:mm A')} status="Failed to upload" failed={true} />
              </div>
            )
          }

           

          {/* Footer Links */}
          <div className="flex items-center justify-center space-x-6">
            <button 
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              onClick={async () => {
                try {
                  // Web app URL - you can change this to your actual web app URL
                  const webAppUrl = 'https://class-capsule-demo.netlify.app/';
                  await window.api.openExternalUrl(webAppUrl);
                } catch (error) {
                  console.error('Error opening web app:', error);
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
