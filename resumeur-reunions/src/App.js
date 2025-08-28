import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Mic, Download, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';

// Configuration des APIs
const ASSEMBLY_AI_API_KEY = process.env.REACT_APP_ASSEMBLY_AI_API_KEY;
const HUGGING_FACE_API_KEY = process.env.REACT_APP_HUGGING_FACE_API_KEY;

// Service de transcription AssemblyAI
class TranscriptionService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.assemblyai.com/v2';
  }

  async uploadAudio(audioFile) {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        'authorization': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur upload AssemblyAI:', response.status, errorData);
      throw new Error(`Erreur upload: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Upload réussi:', data);
    return data.upload_url;
  }

  async transcribe(audioUrl, language = 'fr') {
    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: language,
        speaker_labels: true,
        punctuate: true,
        format_text: true,
        // Vocabulaire métier pour améliorer la précision
        word_boost: ["réunion", "décision", "action", "projet", "équipe", "budget", "planning", "deadline", "objectif"],
        boost_param: "default"
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur transcription AssemblyAI:', response.status, errorData);
      throw new Error(`Erreur transcription: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Transcription démarrée:', data);
    return data.id;
  }

  async getTranscription(transcriptId) {
    let status = 'processing';
    let transcriptData = null;

    while (status === 'processing' || status === 'queued') {
      const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
        headers: {
          'authorization': this.apiKey
        }
      });

      transcriptData = await response.json();
      status = transcriptData.status;

      if (status === 'processing' || status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return transcriptData;
  }
}

// Service de résumé HuggingFace
class SummaryService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
  }

  async summarizeText(text) {
    try {
      const response = await fetch(`${this.baseUrl}/facebook/bart-large-cnn`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text.substring(0, 1024), // BART a une limite de tokens
          parameters: {
            max_length: 150,
            min_length: 50,
            do_sample: false
          }
        })
      });

      const data = await response.json();
      return data[0]?.summary_text || "Résumé non disponible";
    } catch (error) {
      console.error('Erreur lors du résumé:', error);
      return "Erreur lors de la génération du résumé";
    }
  }

  async extractKeyPoints(text) {
    // Utilisation d'un modèle de classification pour extraire les points clés
    try {
      const response = await fetch(`${this.baseUrl}/microsoft/DialoGPT-medium`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: `Extraire les décisions et actions de cette réunion: ${text.substring(0, 512)}`
        })
      });

      const data = await response.json();
      return this.parseKeyPoints(text);
    } catch (error) {
      return this.parseKeyPoints(text);
    }
  }

  parseKeyPoints(text) {
    const decisions = [];
    const actions = [];
    
    // Analyse basique par mots-clés français
    const sentences = text.split(/[.!?]/);
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      if (lowerSentence.includes('décision') || lowerSentence.includes('décidé') || 
          lowerSentence.includes('approuvé') || lowerSentence.includes('validé')) {
        decisions.push(sentence.trim());
      }
      
      if (lowerSentence.includes('action') || lowerSentence.includes('doit') ||
          lowerSentence.includes('va faire') || lowerSentence.includes('responsable')) {
        actions.push(sentence.trim());
      }
    });

    return { decisions: decisions.slice(0, 5), actions: actions.slice(0, 5) };
  }
}

// Composant principal
function App() {
  const [file, setFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState({ decisions: [], actions: [] });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const transcriptionService = new TranscriptionService(ASSEMBLY_AI_API_KEY);
  const summaryService = new SummaryService(HUGGING_FACE_API_KEY);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && (selectedFile.type.startsWith('audio/') || selectedFile.type.startsWith('video/'))) {
      setFile(selectedFile);
      setTranscription('');
      setSummary('');
      setKeyPoints({ decisions: [], actions: [] });
    } else {
      alert('Veuillez sélectionner un fichier audio ou vidéo valide');
    }
  };

  const processFile = async () => {
    if (!file) {
      alert('Veuillez d\'abord sélectionner un fichier');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      // Étape 1: Upload du fichier
      setStatus('Upload du fichier audio...');
      setProgress(20);
      const audioUrl = await transcriptionService.uploadAudio(file);

      // Étape 2: Lancement de la transcription
      setStatus('Démarrage de la transcription...');
      setProgress(40);
      const transcriptId = await transcriptionService.transcribe(audioUrl, 'fr');

      // Étape 3: Attente de la transcription
      setStatus('Transcription en cours...');
      setProgress(60);
      const transcriptData = await transcriptionService.getTranscription(transcriptId);

      if (transcriptData.status === 'completed') {
        setTranscription(transcriptData.text);

        // Étape 4: Génération du résumé
        setStatus('Génération du résumé...');
        setProgress(80);
        const summaryText = await summaryService.summarizeText(transcriptData.text);
        setSummary(summaryText);

        // Étape 5: Extraction des points clés
        setStatus('Extraction des décisions et actions...');
        setProgress(90);
        const extractedPoints = await summaryService.extractKeyPoints(transcriptData.text);
        setKeyPoints(extractedPoints);

        setStatus('Terminé !');
        setProgress(100);
      } else {
        throw new Error('Échec de la transcription');
      }

    } catch (error) {
      console.error('Erreur complète:', error);
      setStatus(`Erreur: ${error.message}`);
      alert(`Erreur lors du traitement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToWord = () => {
    const content = `
RÉSUMÉ DE RÉUNION
==================

Date: ${new Date().toLocaleDateString('fr-FR')}
Fichier: ${file?.name}

RÉSUMÉ EXÉCUTIF
--------------
${summary}

TRANSCRIPTION COMPLÈTE
---------------------
${transcription}

DÉCISIONS PRISES
---------------
${keyPoints.decisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')}

ACTIONS À ENTREPRENDRE
---------------------
${keyPoints.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-reunion-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Mic className="text-blue-600" size={40} />
            Résumeur de Réunions
          </h1>
          <p className="text-gray-600">Transcription et résumé automatique de vos réunions</p>
        </div>

        {/* Upload Section */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="text-blue-600" size={24} />
            Sélectionner un fichier
          </h2>

          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileAudio className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-2">
              {file ? file.name : 'Cliquez pour sélectionner un fichier audio ou vidéo'}
            </p>
            <p className="text-sm text-gray-500">
              Formats supportés : MP3, WAV, MP4, MOV, etc.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileAudio className="text-blue-600" size={20} />
                <span className="text-sm text-gray-600">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={processFile}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    Transcrire et Résumer
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Progress */}
        {loading && (
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-blue-600" size={20} />
              <span className="font-medium">{status}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Results */}
        {summary && (
          <div className="space-y-6">
            {/* Résumé */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={24} />
                Résumé Exécutif
              </h2>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed">{summary}</p>
              </div>
            </div>

            {/* Décisions et Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 text-blue-800">
                  🎯 Décisions Prises
                </h3>
                {keyPoints.decisions.length > 0 ? (
                  <ul className="space-y-2">
                    {keyPoints.decisions.map((decision, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-semibold">{index + 1}.</span>
                        <span className="text-gray-700 text-sm">{decision}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">Aucune décision détectée</p>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4 text-orange-800">
                  ✅ Actions à Entreprendre
                </h3>
                {keyPoints.actions.length > 0 ? (
                  <ul className="space-y-2">
                    {keyPoints.actions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-600 font-semibold">{index + 1}.</span>
                        <span className="text-gray-700 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">Aucune action détectée</p>
                )}
              </div>
            </div>

            {/* Transcription */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="text-gray-600" size={20} />
                  Transcription Complète
                </h3>
                <button
                  onClick={exportToWord}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Download size={16} />
                  Exporter
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {transcription}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Réalisé par Stephan KEITA</p>
        </div>
      </div>
    </div>
  );
}

export default App;