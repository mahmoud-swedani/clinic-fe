// public/libs/arabic-pdf-generator.js
export async function registerArabicFont(doc) {
  const fontUrl = '/fonts/amiri/Amiri-Regular.ttf'
  const fontBytes = await fetch(fontUrl).then((res) => res.arrayBuffer())

  const base64Font = arrayBufferToBase64(fontBytes)

  doc.addFileToVFS('Amiri-Regular.ttf', base64Font)
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal')
  doc.setFont('Amiri')
}

// دالة آمنة لتحويل ArrayBuffer إلى base64
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
