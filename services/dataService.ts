
export const exportToCsv = (data: Record<string, any>[], filename: string) => {
  if (data.length === 0) return;
  
  // Get all unique keys from all objects to ensure consistency
  const allKeys = Array.from(new Set(data.flatMap(Object.keys)));
  
  const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape quotes and wrap in quotes if it contains comma, quote or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
  };

  const header = allKeys.map(escape).join(',');
  const rows = data.map(row => {
      return allKeys.map(key => escape(row[key])).join(',');
  });

  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJson = (data: Record<string, any>[], filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${filename}.json`;
    link.click();
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
