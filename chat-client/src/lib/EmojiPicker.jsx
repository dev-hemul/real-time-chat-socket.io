import EmojiPicker from 'emoji-picker-react';

const EmojiPickerComponent = ({ onEmojiClick }) => {
  return (
    <div className="absolute bottom-full mb-2 z-10">
      <EmojiPicker onEmojiClick={onEmojiClick} />
    </div>
  );
};

export default EmojiPickerComponent;