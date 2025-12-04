
export const exportToCsv = (data: Record<string, any>[], filename: string) => {
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  const csvContent = `${header}\n${rows.join('\n')}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  
  // Cleanup
  URL.revokeObjectURL(url);
};

export const exportToJson = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
}

export const exportToPng = (svgElement: SVGElement, filename: string) => {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    ctx?.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${filename}.png`;
    link.click();
  };
  img.src = url;
};