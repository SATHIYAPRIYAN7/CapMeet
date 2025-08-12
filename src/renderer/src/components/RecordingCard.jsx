import { cn } from '@/lib/utils'
import microphoneIcon from '@/assets/mic.svg'

const RecordingCard = ({ title, icon, isSelected = false, onClick }) => {
  return (
    <div className="flex flex-col justify-center items-center w-full ">
      <div
        onClick={onClick}
        className={cn(
          'relative border-2 rounded-lg p-6 w-[200px] h-[120px] cursor-pointer transition-all flex justify-center items-center duration-200 hover:shadow-md',
          isSelected
            ? 'border-4 border-solid border-black'
            : ''
        )}
      >
        {!isSelected && <div className='h-full w-full absolute bg-gradient-to-b from-white to-black/2 rounded-lg' />}
        <div className=" bg-[#F1F5F9] rounded-lg p-2">
          <div className={cn('text-3xl', 'text-black')}>{icon}</div>
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-recording-card-selected-foreground rounded-full opacity-50"></div>
          </div>
        )}

       {isSelected && <div className='absolute bottom-2 right-2'>
          <img src={microphoneIcon} alt="microphone" className="w-4 h-4" />
        </div>}
      </div>

      <span className={cn('text-sm font-medium mt-1', isSelected ? 'text-black' : 'text-gray-500')}>
        {title}
      </span>
    </div>
  )
}

export default RecordingCard
