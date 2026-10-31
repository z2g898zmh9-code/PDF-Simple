import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet, Platform, Modal, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { decode } from 'base64-arraybuffer';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;
const PURPLE = '#6256D9';
const tools = [
  { id:'image', icon:'🖼️', title:'Images to PDF', sub:'Turn JPG or PNG into a PDF' },
  { id:'merge', icon:'📚', title:'Merge PDFs', sub:'Combine multiple PDF files' },
  { id:'split', icon:'✂️', title:'Split PDF', sub:'Save selected pages separately' },
  { id:'word', icon:'📝', title:'PDF to Word', sub:'Coming in a future update', soon:true },
  { id:'excel', icon:'📊', title:'PDF to Excel', sub:'Coming in a future update', soon:true },
  { id:'jpg', icon:'🌄', title:'PDF to JPG', sub:'Coming in a future update', soon:true },
  { id:'compress', icon:'🗜️', title:'Compress PDF', sub:'Coming in a future update', soon:true }
];

export default function App() {
  const [busy,setBusy] = useState(false);
  const [lastFile,setLastFile] = useState('');
  const [notice,setNotice] = useState('Choose a tool to get started.');
  const [splitSource,setSplitSource] = useState(null);
  const [splitPages,setSplitPages] = useState('1');
  const [splitTotal,setSplitTotal] = useState(0);
  const [splitOpen,setSplitOpen] = useState(false);

  const pick = async (types,multiple=false) => {
    const result = await DocumentPicker.getDocumentAsync({type:types,multiple,copyToCacheDirectory:true});
    if (result.canceled) return [];
    return result.assets || [];
  };
  const saveAndShare = async (bytes,filename) => {
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri,Buffer.from(bytes).toString('base64'),{encoding:FileSystem.EncodingType.Base64});
    setLastFile(filename);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri,{mimeType:'application/pdf',dialogTitle:'Share your PDF'});
    else Alert.alert('Saved',`Created ${filename} in the app cache.`);
  };
  const imageToPdf = async () => {
    const items = await pick(['image/jpeg','image/png'],true);
    if (!items.length) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.create();
      for (const item of items) {
        const b64 = await FileSystem.readAsStringAsync(item.uri,{encoding:FileSystem.EncodingType.Base64});
        const bytes = decode(b64);
        const png = item.mimeType === 'image/png' || item.name?.toLowerCase().endsWith('.png');
        const img = png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const page = pdf.addPage([img.width,img.height]);
        page.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
      }
      await saveAndShare(await pdf.save(),'images-converted.pdf');
      setNotice(`Created a PDF from ${items.length} image(s).`);
    } catch(e) { Alert.alert('Could not convert images',e.message || 'Please try another image.'); }
    finally { setBusy(false); }
  };
  const mergePdfs = async () => {
    const items = await pick('application/pdf',true);
    if (items.length < 2) { Alert.alert('Select at least 2 PDFs','Choose two or more PDF files to merge.'); return; }
    setBusy(true);
    try {
      const merged = await PDFDocument.create();
      for (const item of items) {
        const b64 = await FileSystem.readAsStringAsync(item.uri,{encoding:FileSystem.EncodingType.Base64});
        const source = await PDFDocument.load(decode(b64));
        const pages = await merged.copyPages(source,source.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      await saveAndShare(await merged.save(),'merged-document.pdf');
      setNotice(`Merged ${items.length} PDF files.`);
    } catch(e) { Alert.alert('Could not merge PDFs',e.message || 'Check that the files are valid PDFs.'); }
    finally { setBusy(false); }
  };
  const splitPdf = async () => {
    const items = await pick('application/pdf');
    if (!items.length) return;
    setBusy(true);
    try {
      const b64 = await FileSystem.readAsStringAsync(items[0].uri,{encoding:FileSystem.EncodingType.Base64});
      const source = await PDFDocument.load(decode(b64));
      setSplitSource(source); setSplitTotal(source.getPageCount()); setSplitPages('1'); setSplitOpen(true);
    } catch(e) { Alert.alert('Could not open PDF',e.message || 'Please select a valid PDF.'); }
    finally { setBusy(false); }
  };
  const createSplit = async () => {
    if (!splitSource) return;
    const indexes = [...new Set(splitPages.split(',').map(x => Number(x.trim())-1))].filter(x => Number.isInteger(x) && x >= 0 && x < splitTotal);
    if (!indexes.length) { Alert.alert('No valid pages',`Enter page numbers between 1 and ${splitTotal}.`); return; }
    setSplitOpen(false); setBusy(true);
    try {
      const out = await PDFDocument.create();
      const pages = await out.copyPages(splitSource,indexes);
      pages.forEach(p => out.addPage(p));
      await saveAndShare(await out.save(),'selected-pages.pdf');
      setNotice(`Extracted ${indexes.length} page(s).`);
    } catch(e) { Alert.alert('Split failed',e.message || 'Please try again.'); }
    finally { setBusy(false); setSplitSource(null); }
  };
  const runTool = async id => {
    if (busy) return;
    if (id === 'image') return imageToPdf();
    if (id === 'merge') return mergePdfs();
    if (id === 'split') return splitPdf();
    Alert.alert('Coming soon','This conversion will be added in a future version.');
  };
  return (
    <SafeAreaView style={s.safe}>
      <Modal visible={splitOpen} transparent animationType="fade" onRequestClose={() => setSplitOpen(false)}>
        <View style={s.modalShade}><View style={s.modalCard}>
          <Text style={s.modalTitle}>Split PDF</Text>
          <Text style={s.modalCopy}>This PDF has {splitTotal} pages. Enter page numbers separated by commas (for example: 1,3,5).</Text>
          <TextInput value={splitPages} onChangeText={setSplitPages} keyboardType="numbers-and-punctuation" placeholder="1,3,5" style={s.pageInput}/>
          <View style={s.modalActions}>
            <Pressable onPress={() => setSplitOpen(false)} style={s.cancelButton}><Text style={s.cancelText}>Cancel</Text></Pressable>
            <Pressable onPress={createSplit} style={s.primaryButton}><Text style={s.primaryText}>Create PDF</Text></Pressable>
          </View>
        </View></View>
      </Modal>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.header}><View>
          <Text style={s.brand}>PDF<Text style={{color:PURPLE}}> Simple</Text></Text>
          <Text style={s.tagline}>Your files. Converted simply.</Text>
        </View><View style={s.logo}><Text style={{fontSize:25}}>📄</Text></View></View>
        <View style={s.hero}>
          <Text style={s.heroTitle}>What would you like to do?</Text>
          <Text style={s.heroSub}>Simple tools for your PDF files.</Text>
          {busy ? <View style={s.loading}><ActivityIndicator color="#fff"/><Text style={{color:'#fff',marginLeft:10}}>Working on your file…</Text></View> : null}
        </View>
        <Text style={s.section}>PDF TOOLS</Text>
        <View style={s.grid}>{tools.map(t => (
          <Pressable key={t.id} onPress={() => runTool(t.id)} style={({pressed}) => [s.tool,pressed && {opacity:.7}]}>
            <View style={s.toolIcon}><Text style={{fontSize:24}}>{t.icon}</Text></View>
            <Text style={s.toolTitle}>{t.title}</Text><Text style={s.toolSub}>{t.sub}</Text>
            {t.soon ? <Text style={s.soon}>COMING SOON</Text> : null}
          </Pressable>
        ))}</View>
        <View style={s.recent}><Text style={s.section}>RECENT ACTIVITY</Text><Text style={s.notice}>{lastFile ? `Last created: ${lastFile}` : notice}</Text></View>
        <View style={s.ad}><Text style={s.adLabel}>ADVERTISEMENT</Text><Text style={s.adText}>Ad space — connect Google AdMob before publishing.</Text></View>
        <Text style={s.footer}>Files are processed on your device in this starter version.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F7F7FB'},
  modalShade:{flex:1,backgroundColor:'rgba(20,20,35,.45)',justifyContent:'center',padding:24},
  modalCard:{backgroundColor:'#fff',borderRadius:20,padding:20},
  modalTitle:{fontSize:20,fontWeight:'800',color:'#25253A'},
  modalCopy:{fontSize:13,color:'#77778A',lineHeight:19,marginTop:9},
  pageInput:{borderWidth:1,borderColor:'#DAD9E5',borderRadius:12,padding:13,fontSize:16,marginTop:16,color:'#25253A'},
  modalActions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',marginTop:18},
  cancelButton:{padding:12,marginRight:8}, cancelText:{color:'#66667A',fontWeight:'700'},
  primaryButton:{backgroundColor:PURPLE,paddingVertical:12,paddingHorizontal:16,borderRadius:12}, primaryText:{color:'#fff',fontWeight:'700'},
  page:{padding:20,paddingTop:Platform.OS==='android'?34:18,paddingBottom:36},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:22},
  brand:{fontSize:27,fontWeight:'800',color:'#202033',letterSpacing:-.8}, tagline:{fontSize:13,color:'#77778A',marginTop:3},
  logo:{width:48,height:48,borderRadius:15,backgroundColor:'#ECEAFF',alignItems:'center',justifyContent:'center'},
  hero:{backgroundColor:PURPLE,borderRadius:22,padding:22,marginBottom:26}, heroTitle:{fontSize:21,fontWeight:'800',color:'#fff'},
  heroSub:{fontSize:13,color:'#E8E5FF',marginTop:6}, loading:{flexDirection:'row',alignItems:'center',marginTop:16},
  section:{fontSize:11,fontWeight:'800',letterSpacing:1.2,color:'#88889A',marginBottom:13},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  tool:{width:'48%',backgroundColor:'#fff',borderRadius:17,padding:15,marginBottom:13,minHeight:150,borderWidth:1,borderColor:'#EEEEF4'},
  toolIcon:{width:45,height:45,borderRadius:13,backgroundColor:'#F0EFFF',alignItems:'center',justifyContent:'center',marginBottom:12},
  toolTitle:{fontSize:15,fontWeight:'700',color:'#25253A'},toolSub:{fontSize:11,color:'#88889A',marginTop:5,lineHeight:16},
  soon:{fontSize:9,color:PURPLE,fontWeight:'800',marginTop:9,letterSpacing:.5},
  recent:{marginTop:13,backgroundColor:'#fff',padding:17,borderRadius:16,borderWidth:1,borderColor:'#EEEEF4'},
  notice:{fontSize:13,color:'#66667A'},ad:{marginTop:18,minHeight:74,borderRadius:14,borderWidth:1,borderStyle:'dashed',borderColor:'#C9C8D6',alignItems:'center',justifyContent:'center',padding:12,backgroundColor:'#F1F0F7'},
  adLabel:{fontSize:9,fontWeight:'800',letterSpacing:1,color:'#9998A8'},adText:{fontSize:11,color:'#88889A',marginTop:5,textAlign:'center'},
  footer:{fontSize:10,color:'#A1A1AF',textAlign:'center',marginTop:18}
});
