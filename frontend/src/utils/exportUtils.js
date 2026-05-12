export const exportRoomToCSV = (room) => {
  if (!room) return;

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility

  switch (room.type) {
    case 'POLL':
    case 'RANKING':
      csvContent += 'Option;Votes\n';
      if (room.options) {
        // Sort ranking options by votes
        const options = room.type === 'RANKING' 
          ? [...room.options].sort((a,b) => b.votes - a.votes)
          : room.options;
        options.forEach(opt => {
          csvContent += `"${opt.text.replace(/"/g, '""')}";${opt.votes}\n`;
        });
      }
      break;

    case 'RATING':
      csvContent += 'Option;Average Rating;Total Ratings\n';
      if (room.options) {
        room.options.forEach(opt => {
          const avg = opt.ratingCount > 0 ? (opt.ratingTotal / opt.ratingCount).toFixed(2).replace('.', ',') : '0';
          csvContent += `"${opt.text.replace(/"/g, '""')}";${avg};${opt.ratingCount}\n`;
        });
      }
      break;

    case 'WORDCLOUD':
      csvContent += 'Word;Count\n';
      if (room.words) {
        const words = [...room.words].sort((a, b) => b.count - a.count);
        words.forEach(w => {
          csvContent += `"${w.text.replace(/"/g, '""')}";${w.count}\n`;
        });
      }
      break;

    case 'QNA':
      csvContent += 'Question;Upvotes;Date\n';
      if (room.qnaMessages) {
        const msgs = [...room.qnaMessages].sort((a, b) => b.upvotes - a.upvotes);
        msgs.forEach(msg => {
          const dateStr = new Date(msg.createdAt).toLocaleString();
          csvContent += `"${msg.text.replace(/"/g, '""')}";${msg.upvotes};"${dateStr}"\n`;
        });
      }
      break;

    case 'OPEN_ENDED':
      csvContent += 'Answer;Date\n';
      if (room.openAnswers) {
        const answers = [...room.openAnswers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        answers.forEach(ans => {
          const dateStr = new Date(ans.createdAt).toLocaleString();
          csvContent += `"${ans.text.replace(/"/g, '""')}";"${dateStr}"\n`;
        });
      }
      break;
      
    default:
      console.warn('Unknown room type for export:', room.type);
      return;
  }

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Clean filename
  const cleanTitle = (room.question || room.type).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `pulse_export_${cleanTitle}_${dateStr}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
