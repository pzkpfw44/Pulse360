import React, { useState, useEffect, useCallback } from 'react';
import { Save, AlertTriangle, RefreshCw, Type, Palette, Home, Settings } from 'lucide-react'; // Added Home, Settings for preview
import api from '../../services/api';

// Define default values centrally, matching backend/CSS
const defaultBrandingSettings = {
  companyName: '',
  industry: '',
  keyValues: '',
  tone: 'professional',
  formality: 'formal',
  personality: 'helpful',
  primaryColor: '#3B82F6',
  secondaryColor: '#2563EB',
  fontColorDark: '#1F2937',  // gray-800
  fontColorLight: '#FFFFFF', // white
  fontColorAccent: '#3B82F6', // Default to primary blue
};


const BrandingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  // Initialize formData with defaults
  const [formData, setFormData] = useState(defaultBrandingSettings);

  // --- Helper to apply colors to CSS variables ---
  // Wrap in useCallback to stabilize its reference if needed elsewhere, though not strictly necessary here
  const applyColorsToDocument = useCallback((settings) => {
      // Ensure settings is an object before trying to access properties
      const safeSettings = settings && typeof settings === 'object' ? settings : defaultBrandingSettings;

      // Use defaults if a specific color is missing/invalid (basic check)
      const primary = safeSettings.primaryColor || defaultBrandingSettings.primaryColor;
      const secondary = safeSettings.secondaryColor || defaultBrandingSettings.secondaryColor;
      const fontAccent = safeSettings.fontColorAccent || primary; // Default accent to primary
      const fontDark = safeSettings.fontColorDark || defaultBrandingSettings.fontColorDark;
      const fontLight = safeSettings.fontColorLight || defaultBrandingSettings.fontColorLight;

      document.documentElement.style.setProperty('--color-primary', primary);
      document.documentElement.style.setProperty('--color-secondary', secondary);
      document.documentElement.style.setProperty('--color-accent', fontAccent); // Use fontAccent

      document.documentElement.style.setProperty('--color-text-base', fontDark);
      document.documentElement.style.setProperty('--color-text-inverted', fontLight);
      document.documentElement.style.setProperty('--color-text-accent', fontAccent); // Text accent uses fontAccent

      // Determine text color on primary/secondary/accent based on lightness contrast (simple example)
      const isDark = (hexColor) => {
          if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return false;
          const color = hexColor.substring(1);
          const rgb = parseInt(color, 16);
          if (isNaN(rgb)) return false; // Handle invalid hex parse
          const r = (rgb >> 16) & 0xff;
          const g = (rgb >>  8) & 0xff;
          const b = (rgb >>  0) & 0xff;
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          return luma < 140; // Adjusted threshold slightly for better contrast choices
      };

      // Set text colors for placing text ON the brand colors
      document.documentElement.style.setProperty('--color-text-on-primary', isDark(primary) ? fontLight : fontDark);
      document.documentElement.style.setProperty('--color-text-on-secondary', isDark(secondary) ? fontLight : fontDark);
      document.documentElement.style.setProperty('--color-text-on-accent', isDark(fontAccent) ? fontLight : fontDark);

      // Update sidebar background variable (used by Tailwind config)
      document.documentElement.style.setProperty('--color-bg-sidebar', primary);

  }, []); // Empty dependency array means this function reference is stable


  // --- Fetch settings on mount ---
  const fetchSettings = useCallback(async () => {
    // Added check to prevent running if component unmounted? Maybe not needed here.
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const response = await api.get('/settings/branding');
      const fetchedSettings = response.data || {};

      // Merge fetched data with defaults carefully
      const newSettings = {
        ...defaultBrandingSettings,
        ...fetchedSettings,
        primaryColor: fetchedSettings.primaryColor || defaultBrandingSettings.primaryColor,
        secondaryColor: fetchedSettings.secondaryColor || defaultBrandingSettings.secondaryColor,
        fontColorDark: fetchedSettings.fontColorDark || defaultBrandingSettings.fontColorDark,
        fontColorLight: fetchedSettings.fontColorLight || defaultBrandingSettings.fontColorLight,
         // Ensure accent font color defaults correctly based on fetched primary if accent is missing
        fontColorAccent: fetchedSettings.fontColorAccent || fetchedSettings.primaryColor || defaultBrandingSettings.primaryColor,
      };

      setFormData(newSettings);
      applyColorsToDocument(newSettings); // Apply fetched colors
      localStorage.setItem('brandingSettings', JSON.stringify(newSettings));

    } catch (err) {
      console.error('Error fetching branding settings:', err);
      setError('Failed to load branding settings. Using default values.');
      // Apply defaults visually if fetch fails
      applyColorsToDocument(defaultBrandingSettings);
      setFormData(defaultBrandingSettings); // Ensure state reflects defaults
    } finally {
      setLoading(false);
    }
  // Include applyColorsToDocument in dependency array as it's used inside
  }, [applyColorsToDocument]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]); // Runs once on mount as fetchSettings is stable


  // --- Apply colors whenever formData state changes ---
  useEffect(() => {
    // Only apply if formData is valid (basic check)
    if (formData && formData.primaryColor) {
        applyColorsToDocument(formData);
    }
  }, [formData, applyColorsToDocument]); // Re-run when formData or the apply function changes


  // --- Input Handling ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        // Create a copy to modify
        const updatedData = { ...prev, [name]: value };

         // If primaryColor changes, also update fontColorAccent *unless* fontColorAccent was the field being changed
         if (name === 'primaryColor' && name !== 'fontColorAccent') {
            // Only update accent if primary changes AND fontColorAccent wasn't the trigger
            updatedData.fontColorAccent = value;
         }
         // ** REMOVED the line that set updatedData.accent **

        return updatedData;
    });
  };

  // --- Revert Colors ---
   const handleRevertColors = () => {
    // Create the object with default colors
    const revertedColors = {
      primaryColor: defaultBrandingSettings.primaryColor,
      secondaryColor: defaultBrandingSettings.secondaryColor,
      fontColorDark: defaultBrandingSettings.fontColorDark,
      fontColorLight: defaultBrandingSettings.fontColorLight,
      // Ensure accent reverts based on default primary
      fontColorAccent: defaultBrandingSettings.primaryColor,
    };
    // Update the state with these reverted colors merged into existing state
    setFormData(prev => ({
      ...prev, // Keep non-color settings like companyName etc.
      ...revertedColors
    }));
     // Explicitly apply reverted colors immediately (optional, useEffect will catch it too)
    // applyColorsToDocument({ ...formData, ...revertedColors });
  };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Prepare data for API, ensuring defaults if somehow empty/invalid
    const dataToSave = {
        ...defaultBrandingSettings, // Base defaults
        ...formData, // Current form state
        // Re-validate/default colors just before saving
        primaryColor: formData.primaryColor || defaultBrandingSettings.primaryColor,
        secondaryColor: formData.secondaryColor || defaultBrandingSettings.secondaryColor,
        fontColorDark: formData.fontColorDark || defaultBrandingSettings.fontColorDark,
        fontColorLight: formData.fontColorLight || defaultBrandingSettings.fontColorLight,
        fontColorAccent: formData.fontColorAccent || formData.primaryColor || defaultBrandingSettings.primaryColor,
    };


    try {
      setSaving(true);
      const response = await api.put('/settings/branding', dataToSave);

      // Update state and localStorage with the response from the server
      // as it might have applied different defaults or validations
      const savedSettings = { ...defaultBrandingSettings, ...response.data };
      setFormData(savedSettings); // Update state from response
      localStorage.setItem('brandingSettings', JSON.stringify(savedSettings));
      // No need to call applyColors here, the useEffect [formData] will trigger it

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving branding settings:', err);
       if (err.response && err.response.data && err.response.data.errors) {
           const messages = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join('; ');
           setError(`Validation Failed: ${messages}. Please correct the values.`);
       } else if (err.response && err.response.data && err.response.data.message) {
            setError(`Failed to save: ${err.response.data.message}`);
       } else {
           setError('Failed to save branding settings. An unknown error occurred.');
       }
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  // --- Loading State ---
  // Use themed border color for spinner
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-border-muted border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-text-muted">Loading branding settings...</p>
      </div>
    );
  }

  // --- Render Component ---
  // Wrap return in a fragment or div if needed, though top-level div exists
  return (
    // Use themed background and border
    <div className="bg-bg-surface shadow overflow-hidden sm:rounded-lg border border-border-muted">
      {/* Use themed text and border */}
      <div className="px-4 py-5 sm:px-6 border-b border-border-base">
        <h3 className="text-lg leading-6 font-medium text-text-base">
          Company Branding & Voice
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Configure colors, fonts, and AI communication style.
        </p>
      </div>

      {/* Error/Success Messages - Already use Tailwind classes, should be fine */}
      {error && (
        <div className="mx-4 sm:mx-6 my-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0"> <AlertTriangle className="h-5 w-5 text-red-400" /> </div>
            <div className="ml-3"> <p className="text-sm text-red-700">{error}</p> </div>
          </div>
        </div>
      )}
      {success && (
        <div className="mx-4 sm:mx-6 my-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0"> <RefreshCw className="h-5 w-5 text-green-400" /> </div>
            <div className="ml-3"> <p className="text-sm text-green-700">Settings saved successfully</p> </div>
          </div>
        </div>
      )}

      {/* --- Form Start --- */}
      {/* Add key prop if this form is part of a list, otherwise not needed */}
      <form onSubmit={handleSubmit}>
        {/* Use themed padding and text */}
        <div className="px-4 py-5 sm:p-6">

          {/* Company Identity Section */}
          <h4 className="text-md font-medium text-text-base mb-4">Company Identity</h4>
          <div className="grid grid-cols-6 gap-6">
            {/* Company Name */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="companyName" className="block text-sm font-medium text-text-muted"> Company Name </label>
              {/* Use themed form input classes */}
              <input type="text" name="companyName" id="companyName" value={formData.companyName || ''} onChange={handleInputChange}
                className="form-input mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-bg-surface text-text-base" />
            </div>
            {/* Industry */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="industry" className="block text-sm font-medium text-text-muted"> Industry </label>
              <input type="text" name="industry" id="industry" value={formData.industry || ''} onChange={handleInputChange} placeholder="Technology, Healthcare, etc."
                className="form-input mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-bg-surface text-text-base" />
            </div>
            {/* Key Values */}
            <div className="col-span-6">
              <label htmlFor="keyValues" className="block text-sm font-medium text-text-muted"> Key Values & Principles </label>
              <textarea name="keyValues" id="keyValues" rows="3" value={formData.keyValues || ''} onChange={handleInputChange} placeholder="Describe core values (e.g., innovation, integrity)"
                className="form-textarea mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-bg-surface text-text-base"></textarea>
            </div>
          </div>

          {/* --- BRAND COLORS SECTION --- */}
          <h4 className="text-md font-medium text-text-base mt-8 mb-1 flex items-center">
             <Palette className="w-4 h-4 mr-2 text-text-muted"/> Brand Colors
          </h4>
           <p className="text-sm text-text-muted mb-4">Define the main colors used throughout the application.</p>
          <div className="grid grid-cols-6 gap-x-6 gap-y-4">
             {/* Primary Color */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="primaryColor" className="block text-sm font-medium text-text-muted"> Primary Color </label>
              <div className="mt-1 flex items-center">
                <input type="color" name="primaryColor" id="primaryColor" value={formData.primaryColor} onChange={handleInputChange}
                  className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                <input type="text" name="primaryColor" value={formData.primaryColor} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (#FF5733)" placeholder="#3B82F6"
                  className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-bg-surface text-text-base"/>
              </div>
              <p className="mt-1 text-xs text-text-muted"> Main color for headers, buttons, accents. </p>
            </div>
             {/* Secondary Color */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-text-muted"> Secondary Color </label>
              <div className="mt-1 flex items-center">
                <input type="color" name="secondaryColor" id="secondaryColor" value={formData.secondaryColor} onChange={handleInputChange}
                   className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                <input type="text" name="secondaryColor" value={formData.secondaryColor} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (#2563EB)" placeholder="#2563EB"
                  className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-bg-surface text-text-base"/>
              </div>
              <p className="mt-1 text-xs text-text-muted"> Used for gradients and highlights. </p>
            </div>
          </div>


          {/* --- FONT COLORS SECTION --- */}
          <h4 className="text-md font-medium text-text-base mt-8 mb-1 flex items-center">
             <Type className="w-4 h-4 mr-2 text-text-muted"/> Font Colors
          </h4>
          <p className="text-sm text-text-muted mb-4">Define the colors used for text across the application.</p>
          <div className="grid grid-cols-6 gap-x-6 gap-y-4">
             {/* Font Color Dark (Base Text) */}
             <div className="col-span-6 sm:col-span-2">
                <label htmlFor="fontColorDark" className="block text-sm font-medium text-text-muted"> Base Text (Dark) </label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="fontColorDark" id="fontColorDark" value={formData.fontColorDark} onChange={handleInputChange} className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                    <input type="text" name="fontColorDark" value={formData.fontColorDark} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (#1F2937)" placeholder="#1F2937"
                     className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-bg-surface text-text-base"/>
                </div>
                 <p className="mt-1 text-xs text-text-muted">Default text on light backgrounds.</p>
            </div>
            {/* Font Color Light (Inverted Text) */}
             <div className="col-span-6 sm:col-span-2">
                <label htmlFor="fontColorLight" className="block text-sm font-medium text-text-muted"> Inverted Text (Light) </label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="fontColorLight" id="fontColorLight" value={formData.fontColorLight} onChange={handleInputChange} className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                    <input type="text" name="fontColorLight" value={formData.fontColorLight} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (#FFFFFF)" placeholder="#FFFFFF"
                     className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-bg-surface text-text-base"/>
                </div>
                 <p className="mt-1 text-xs text-text-muted">Text on dark/colored backgrounds.</p>
            </div>
             {/* Font Color Accent */}
             <div className="col-span-6 sm:col-span-2">
                <label htmlFor="fontColorAccent" className="block text-sm font-medium text-text-muted"> Accent Text </label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="fontColorAccent" id="fontColorAccent" value={formData.fontColorAccent} onChange={handleInputChange} className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                    <input type="text" name="fontColorAccent" value={formData.fontColorAccent} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (e.g., #3B82F6)" placeholder="#3B82F6"
                     className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-bg-surface text-text-base"/>
                </div>
                 <p className="mt-1 text-xs text-text-muted">Color for links or emphasis. Defaults to Primary.</p>
            </div>

            {/* Revert to Default Button */}
            <div className="col-span-6 pt-2">
              {/* Use themed button styles */}
              <button type="button" onClick={handleRevertColors}
                className="inline-flex items-center px-3 py-2 border border-border-base shadow-sm text-sm leading-4 font-medium rounded-md text-text-muted bg-bg-surface hover:bg-bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                <RefreshCw className="h-4 w-4 mr-2" /> Revert Colors to Default
              </button>
            </div>
          </div>


            {/* --- COLOR PREVIEW SECTION --- */}
             <div className="col-span-6 mt-8">
                <label className="block text-sm font-medium text-text-muted mb-2"> Color Preview </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* UI Elements Preview (Using Tailwind semantic classes) */}
                    <div className="p-4 rounded-md shadow-sm border border-border-base bg-bg-surface">
                        <h5 className="text-sm font-medium mb-3 text-text-base">UI Elements</h5>
                        <div className="space-y-3">
                            <button type="button" className="px-3 py-1.5 rounded text-on-primary bg-primary hover:bg-primary-hover text-sm font-medium transition-colors"> Primary Button </button>
                             <button type="button" className="px-3 py-1.5 rounded text-on-secondary bg-secondary hover:bg-secondary-hover text-sm font-medium transition-colors ml-2"> Secondary Button </button>
                             <button type="button" className="px-3 py-1.5 rounded text-on-accent bg-accent hover:bg-accent-hover text-sm font-medium transition-colors ml-2"> Accent Button </button>
                            <div className="h-8 rounded bg-gradient-brand"></div>
                            <div className="flex items-center">
                                <div className="h-5 w-5 rounded-full mr-2 bg-primary"></div>
                                <span className="text-sm text-text-base">Base text color</span>
                            </div>
                             <div className="flex items-center">
                                <div className="h-5 w-5 rounded-full mr-2 bg-accent"></div>
                                <span className="text-sm text-text-accent">Accent text color (link)</span>
                            </div>
                            <div className="p-2 rounded bg-primary">
                                <span className="text-sm text-on-primary">Text on primary background</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Preview (Using Tailwind semantic classes) */}
                    <div className="p-4 rounded-md shadow-sm border border-border-base bg-bg-surface">
                         <h5 className="text-sm font-medium mb-3 text-text-base">Sidebar Preview</h5>
                        {/* Use bg-gradient-sidebar defined in tailwind.config.js */}
                        <div className="rounded-lg h-36 p-3 text-on-primary bg-gradient-sidebar overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                {/* Use themed colors for logo placeholder */}
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface text-primary text-xs font-bold flex-shrink-0">
                                    {(formData.companyName || 'P').charAt(0)}
                                </div>
                                <span className="text-md font-bold text-on-primary truncate">{formData.companyName || 'Pulse360'}</span>
                            </div>
                            {/* Use themed colors for nav items */}
                            <div className="flex gap-2 items-center text-sm p-1.5 rounded-md bg-white/20 text-on-primary font-medium">
                               <Home className="w-4 h-4 flex-shrink-0"/> <span className="truncate">Dashboard</span>
                            </div>
                             <div className="flex gap-2 items-center text-sm p-1.5 rounded-md text-on-primary/90 hover:bg-white/10 hover:text-on-primary">
                               <Settings className="w-4 h-4 flex-shrink-0"/> <span className="truncate">Settings</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


          {/* --- COMMUNICATION STYLE SECTION --- */}
          <h4 className="text-md font-medium text-text-base mt-8 mb-4">Communication Style</h4>
           <div className="grid grid-cols-6 gap-6">
            {/* Tone */}
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="tone" className="block text-sm font-medium text-text-muted"> Tone </label>
              {/* Use themed form select classes */}
              <select id="tone" name="tone" value={formData.tone} onChange={handleInputChange}
                className="form-select mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-bg-surface text-text-base">
                <option value="professional">Professional</option> <option value="friendly">Friendly</option> <option value="casual">Casual</option> <option value="enthusiastic">Enthusiastic</option> <option value="authoritative">Authoritative</option>
              </select>
            </div>
            {/* Formality */}
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="formality" className="block text-sm font-medium text-text-muted"> Formality Level </label>
              <select id="formality" name="formality" value={formData.formality} onChange={handleInputChange}
                className="form-select mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-bg-surface text-text-base">
                <option value="formal">Formal</option> <option value="semiformal">Semi-formal</option> <option value="informal">Informal</option>
              </select>
            </div>
             {/* Personality */}
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="personality" className="block text-sm font-medium text-text-muted"> Personality </label>
              <select id="personality" name="personality" value={formData.personality} onChange={handleInputChange}
                 className="form-select mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-bg-surface text-text-base">
                <option value="helpful">Helpful</option> <option value="innovative">Innovative</option> <option value="collaborative">Collaborative</option> <option value="direct">Direct</option> <option value="empathetic">Empathetic</option>
              </select>
            </div>
          </div>

          {/* AI Preview - Use themed styles */}
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="text-sm font-medium text-primary mb-2">Preview: How AI Will Sound</h4>
            <p className="text-sm text-primary/90">
              {/* Dynamic preview based on selections */}
              {formData.tone === 'professional' && "We value your input..."} {formData.formality === 'formal' && "We are here to assist..."} {formData.personality === 'helpful' && "We're here to support..."}
              {/* Add more complete preview logic if desired */}
              {formData.tone !== 'professional' && formData.formality !== 'formal' && formData.personality !== 'helpful' && "Configure tone, formality, and personality above."}
            </p>
          </div>
        </div> {/* End main content padding */}

        {/* --- Form Footer/Actions --- */}
        {/* Use themed background, border, button */}
        <div className="px-4 py-3 bg-bg-muted text-right sm:px-6 border-t border-border-base">
          <button type="submit" disabled={saving || loading}
            // Use themed button classes + disabled state
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-on-primary
                        ${(saving || loading) ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'}
                        transition-colors duration-150 ease-in-out`}>
            {saving ? (
              <> {/* Spinner SVG */} Saving... </>
            ) : (
              <> <Save className="h-4 w-4 mr-1" /> Save Settings </>
            )}
          </button>
        </div>
      </form>
      {/* --- Form End --- */}
    </div>
  );
};

export default BrandingSettings;