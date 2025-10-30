
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, Modality, LiveServerMessage, Blob } from '@google/genai';
import type { Message, Product } from '../types';
import type { IFilters } from '../services/geminiService';
import { PRODUCTS } from '../constants';
import { BotIcon, SendIcon, MicIcon, MicOffIcon, XIcon, LoadingSpinner, ChatIcon } from './icons';

// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// FIX: Updated decodeAudioData to be more robust and align with Gemini API guidelines.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

const linkify = (text: string) => {
    // Escape HTML to prevent XSS, then linkify URLs and replace newlines.
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Using break-all to prevent long URLs from overflowing the chat bubble
    return escapedText.replace(/\n/g, '<br />').replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">$1</a>');
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

interface ChatbotProps {
    filters: IFilters;
    products: Product[];
}

export const Chatbot: React.FC<ChatbotProps> = ({ filters, products }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Load messages from localStorage on initial render
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const saved = localStorage.getItem('ion-chatbot-history');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Could not load messages from local storage', e);
        }
        return [{ id: '1', role: 'model', content: "Hello! I'm the ION Solution Expert. How can I help you find the right commodity management solution today?" }];
    });

    // Save messages to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('ion-chatbot-history', JSON.stringify(messages));
        } catch (e) {
            console.error('Could not save messages to local storage', e);
        }
    }, [messages]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Voice Chat State ---
    const [micState, setMicState] = useState<'idle' | 'connecting' | 'listening'>('idle');
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    
    const getSystemInstruction = useCallback(() => {
        const filterDescriptions = Object.entries(filters)
            .filter(([, value]) => value !== null)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

        return `You are a friendly and knowledgeable AI assistant called the 'ION Solution Expert'. Your goal is to help users find the right ION commodity management software.
- Greet the user and offer to help.
- You have access to a list of ION products and their details.
- The full list of products is: ${JSON.stringify(PRODUCTS)}.
- The user has currently filtered the list to these products: ${products.length > 0 ? JSON.stringify(products.map(p => p.productName)) : "None"}.
- The user's current filter selections are: ${filterDescriptions || "None"}.
- Use this context to provide personalized recommendations and answer questions.
- If asked about a specific product, provide a short description and a link to the product page. The URL should follow this format: https://iongroup.com/products/{category}/{product-name}/ where {category} is the product's category in lowercase (e.g., 'commodities' or 'markets') and {product-name} is the product's name converted to a URL-friendly format (lowercase, spaces replaced with hyphens, and special characters like parentheses removed). For example, for 'RightAngle' (category: 'Commodities'), the link is 'https://iongroup.com/products/commodities/rightangle/'. For 'Decision Support Center (DSC)', the link would be 'https://iongroup.com/products/commodities/decision-support-center-dsc/'.
- If the user has selected a role and industry, ask them insightful, open-ended questions to understand their specific challenges and needs. For example: 'What are the biggest hurdles in your current risk management process?' or 'Could you tell me more about your operational workflow?'. This will help the ION BDR team.
- Keep your responses concise and helpful. Do not mention that you are an AI.
- Do not output markdown.
- IMPORTANT: When you ask a question where the user should choose from a set of options, first state the question. Then, on a new line, provide the options as a JSON string array prefixed with \`OPTIONS_JSON:\`. For example:
What are your biggest challenges?
OPTIONS_JSON: ["Manual processes", "Data accuracy", "System integration"]
- Only use this specific \`OPTIONS_JSON:\` format when presenting choices. Do not include any other text after the JSON array.`;
    }, [filters, products]);


    useEffect(() => {
        // When the component loads or filters change, initialize a new chat session.
        // We seed it with the existing conversation history.
        const history = messages
            // The first message is the default greeting, don't include it in the history
            // for the model, as it might confuse it into repeating the greeting.
            .filter(msg => msg.id !== '1')
            .map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }));
            
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history, // Provide the loaded history
            config: {
                systemInstruction: getSystemInstruction()
            }
        });
    }, [getSystemInstruction]); // Re-initialize chat when context (filters) changes
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const sendMessage = async (messageContent: string) => {
        if (!messageContent.trim() || isLoading) return;

        const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: messageContent };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!chatRef.current) throw new Error("Chat not initialized");

            const response = await chatRef.current.sendMessage({ message: messageContent });
            
            let modelResponse: Message;
            const responseText = response.text;
            const optionsMarker = 'OPTIONS_JSON:';
            const optionsIndex = responseText.indexOf(optionsMarker);

            if (optionsIndex !== -1) {
                const content = responseText.substring(0, optionsIndex).trim();
                const optionsJsonString = responseText.substring(optionsIndex + optionsMarker.length).trim();
                try {
                    const options = JSON.parse(optionsJsonString);
                    modelResponse = { 
                        id: (Date.now() + 1).toString(), 
                        role: 'model', 
                        content: content,
                        options: options,
                        optionsAnswered: false
                    };
                } catch (e) {
                    console.error("Failed to parse options JSON:", e);
                    modelResponse = { id: (Date.now() + 1).toString(), role: 'model', content: responseText };
                }
            } else {
                modelResponse = { id: (Date.now() + 1).toString(), role: 'model', content: responseText };
            }

            setMessages(prev => [...prev, modelResponse]);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorResponse: Message = { id: (Date.now() + 1).toString(), role: 'model', content: "Sorry, I'm having trouble connecting right now." };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };
    
    const handleOptionClick = (messageId: string, option: string) => {
        setMessages(prevMessages => 
            prevMessages.map(msg => 
                msg.id === messageId ? { ...msg, optionsAnswered: true } : msg
            )
        );
        sendMessage(option);
    };

    const stopListening = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().then(() => inputAudioContextRef.current = null);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
             for (const source of audioSourcesRef.current.values()) {
                source.stop();
            }
            audioSourcesRef.current.clear();
            outputAudioContextRef.current.close().then(() => outputAudioContextRef.current = null);
        }
        setMicState('idle');
    }, []);

    const toggleListening = async () => {
        if (micState === 'listening' || micState === 'connecting') {
            stopListening();
            return;
        }

        setMicState('connecting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            // FIX: Use a cross-browser compatible way to get AudioContext that satisfies TypeScript.
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            audioSourcesRef.current.clear();
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';


            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: getSystemInstruction(),
                },
                callbacks: {
                    onopen: () => {
                        if (!inputAudioContextRef.current || !audioStreamRef.current) {
                            return; // Component might have been unmounted or stopped.
                        }
                        setMicState('listening');

                        const source = inputAudioContextRef.current.createMediaStreamSource(audioStreamRef.current);
                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            currentInputTranscriptionRef.current += text;
                            setInput(currentInputTranscriptionRef.current);
                        }

                        if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            currentOutputTranscriptionRef.current += text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInputTranscription = currentInputTranscriptionRef.current;
                            const fullOutputTranscription = currentOutputTranscriptionRef.current;
                            
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            setInput('');

                            if (fullInputTranscription.trim()) {
                                const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: fullInputTranscription.trim() };
                                setMessages(prev => [...prev, newUserMessage]);
                            }

                            if (fullOutputTranscription.trim()) {
                                let modelResponse: Message;
                                const responseText = fullOutputTranscription.trim();
                                const optionsMarker = 'OPTIONS_JSON:';
                                const optionsIndex = responseText.indexOf(optionsMarker);
                    
                                if (optionsIndex !== -1) {
                                    const content = responseText.substring(0, optionsIndex).trim();
                                    const optionsJsonString = responseText.substring(optionsIndex + optionsMarker.length).trim();
                                    try {
                                        const options = JSON.parse(optionsJsonString);
                                        modelResponse = { 
                                            id: (Date.now() + 1).toString(), 
                                            role: 'model', 
                                            content: content,
                                            options: options,
                                            optionsAnswered: false
                                        };
                                    } catch (e) {
                                        console.error("Failed to parse options JSON from voice output:", e);
                                        modelResponse = { id: (Date.now() + 1).toString(), role: 'model', content: responseText };
                                    }
                                } else {
                                    modelResponse = { id: (Date.now() + 1).toString(), role: 'model', content: responseText };
                                }
                                setMessages(prev => [...prev, modelResponse]);
                            }
                        }

                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e) => {
                        console.error("Live session error:", e);
                        stopListening();
                    },
                    onclose: () => {
                        setMicState('idle');
                    },
                },
            });

        } catch (err) {
            console.error("Error starting voice chat:", err);
            stopListening();
        }
    };
    
    const lastModelMessageWithOptions = [...messages]
        .reverse()
        .find(msg => msg.role === 'model' && msg.options);
    const needsOptionSelection = lastModelMessageWithOptions && !lastModelMessageWithOptions.optionsAnswered;

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-50 ${isOpen ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`}
                aria-label="Open chat"
            >
                <ChatIcon className="w-8 h-8"/>
            </button>

            <div className={`fixed bottom-6 right-6 w-[calc(100%-3rem)] max-w-md h-[70vh] max-h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl transition-all duration-300 ease-in-out z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-full">
                           <BotIcon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-bold text-slate-800">ION Solution Expert</h3>
                    </div>
                    <button onClick={() => { setIsOpen(false); stopListening(); }} className="text-slate-400 hover:text-slate-600">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-end gap-2 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><BotIcon className="w-5 h-5 text-slate-500"/></div>}
                                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: linkify(msg.content) }}></p>
                                </div>
                            </div>
                            {msg.role === 'model' && msg.options && (
                                <div className="flex flex-wrap gap-2 mt-2 ml-10">
                                    {msg.options.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleOptionClick(msg.id, option)}
                                            disabled={isLoading || msg.optionsAnswered}
                                            className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-300 text-blue-600 rounded-full hover:bg-blue-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0"><BotIcon className="w-5 h-5 text-slate-500"/></div>
                            <div className="max-w-[80%] p-3 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-none">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleFormSubmit} className="flex items-center gap-2 p-3 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center w-9 h-9 ${
                            micState === 'listening' ? 'bg-red-100 text-red-500' :
                            micState === 'connecting' ? 'bg-yellow-100 text-yellow-500' :
                            'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        aria-label={micState === 'listening' ? 'Stop listening' : 'Start listening'}
                    >
                        {micState === 'connecting' && <LoadingSpinner />}
                        {micState === 'listening' && <MicOffIcon className="w-5 h-5" />}
                        {micState === 'idle' && <MicIcon className="w-5 h-5" />}
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            needsOptionSelection ? "Please select an option above" : 
                            micState === 'listening' ? "Listening..." : 
                            micState === 'connecting' ? "Connecting to voice..." :
                            "Ask a question..."
                        }
                        className="flex-1 w-full px-4 py-2 bg-slate-100 rounded-full border-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        disabled={isLoading || needsOptionSelection}
                    />
                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-300 transition-colors" disabled={isLoading || !input.trim()}>
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </>
    );
};
