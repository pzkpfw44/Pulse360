import React, { useState, useEffect, useCallback } from 'react';
import { Save, AlertTriangle, RefreshCw, Type, Palette } from 'lucide-react'; // Added Type, Palette icons
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

  // --- Fetch settings on mount ---
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/branding');
      const fetchedSettings = response.data || {};

      // Merge fetched data with defaults to ensure all fields are present
      const newSettings = {
        ...defaultBrandingSettings, // Start with defaults
        ...fetchedSettings,       // Override with fetched data
        // Ensure secondary isn't null from backend response
        secondaryColor: fetchedSettings.secondaryColor || defaultBrandingSettings.secondaryColor,
         // Ensure accent font color defaults correctly if missing from backend
         fontColorAccent: fetchedSettings.fontColorAccent || fetchedSettings.primaryColor || defaultBrandingSettings.primaryColor,
      };

      setFormData(newSettings);

      // Apply initial colors to the actual document (for live preview outside this component)
      applyColorsToDocument(newSettings);

      // Save complete settings to localStorage when loaded/refreshed
      localStorage.setItem('brandingSettings', JSON.stringify(newSettings));

      setError(null);
    } catch (err) {
      console.error('Error fetching branding settings:', err);
      setError('Failed to load branding settings. Please try refreshing the page.');
      // Keep defaults in formData on error
      applyColorsToDocument(defaultBrandingSettings); // Apply defaults visually
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]); // fetchSettings is stable due to useCallback

  // --- Apply colors dynamically for the preview within this component ---
  // This useEffect updates the CSS variables whenever formData changes
  const applyColorsToDocument = (settings) => {
      document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
      document.documentElement.style.setProperty('--color-secondary', settings.secondaryColor);
      document.documentElement.style.setProperty('--color-accent', settings.fontColorAccent); // Accent color IS fontColorAccent now

      document.documentElement.style.setProperty('--color-text-base', settings.fontColorDark);
      document.documentElement.style.setProperty('--color-text-inverted', settings.fontColorLight);
      document.documentElement.style.setProperty('--color-text-accent', settings.fontColorAccent);

      // You might derive these or set them directly if you add more controls
      // For now, assume light text on primary/secondary/accent backgrounds
      document.documentElement.style.setProperty('--color-text-on-primary', settings.fontColorLight);
      document.documentElement.style.setProperty('--color-text-on-secondary', settings.fontColorLight);
      document.documentElement.style.setProperty('--color-text-on-accent', settings.fontColorLight);

      // Update sidebar background variable (used by Tailwind config)
       document.documentElement.style.setProperty('--color-bg-sidebar', settings.primaryColor);

  };

  useEffect(() => {
    // This applies changes *during* user interaction within this component
    applyColorsToDocument(formData);
  }, [formData]); // Re-run whenever formData changes

  // --- Input Handling ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const updatedData = { ...prev, [name]: value };

         // If primaryColor changes, also update fontColorAccent *unless* fontColorAccent was just changed explicitly
         if (name === 'primaryColor' && value !== prev.fontColorAccent) {
             // Check if fontColorAccent input exists and has the same name
             const accentInput = e.target.form?.elements.namedItem('fontColorAccent');
             // Only update accent if the primary color is changing AND the accent input wasn't the source of the event
             if (!accentInput || accentInput !== e.target) {
                updatedData.fontColorAccent = value;
             }
         }
         // If fontColorAccent changes, update the accent variable
         if (name === 'fontColorAccent') {
            updatedData.accent = value; // Keep accent color in sync
         }

        return updatedData;
    });
  };

  // --- Revert Colors ---
   const handleRevertColors = () => {
    const revertedColors = {
      primaryColor: defaultBrandingSettings.primaryColor,
      secondaryColor: defaultBrandingSettings.secondaryColor,
      fontColorDark: defaultBrandingSettings.fontColorDark,
      fontColorLight: defaultBrandingSettings.fontColorLight,
      fontColorAccent: defaultBrandingSettings.primaryColor, // Revert accent to default primary
    };
    setFormData(prev => ({
      ...prev,
      ...revertedColors
    }));
     // Explicitly apply reverted colors to the document immediately
    applyColorsToDocument({ ...formData, ...revertedColors });
  };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setSuccess(false);

    // Prepare data for API, ensuring defaults if somehow empty
    const dataToSave = {
        ...defaultBrandingSettings, // Start with defaults
        ...formData,              // Override with form data
        // Ensure secondary isn't null/empty string before sending
        secondaryColor: formData.secondaryColor || defaultBrandingSettings.secondaryColor,
         // Ensure accent isn't empty, default to primary if needed
         fontColorAccent: formData.fontColorAccent || formData.primaryColor || defaultBrandingSettings.primaryColor,
    };


    try {
      setSaving(true);
      const response = await api.put('/settings/branding', dataToSave);

       // Update localStorage with the successfully saved (and potentially defaulted by backend) data
      const savedSettings = { ...defaultBrandingSettings, ...response.data };
      localStorage.setItem('brandingSettings', JSON.stringify(savedSettings));

      // Optionally update formData state again from response to reflect any backend defaults/changes
      setFormData(savedSettings);
      // Apply these potentially modified colors again
      applyColorsToDocument(savedSettings);


      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving branding settings:', err);
       if (err.response && err.response.data && err.response.data.errors) {
           // Display validation errors from backend
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
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-text-muted">Loading branding settings...</p>
      </div>
    );
  }

  // --- Render Component ---
  return (
    <div className="bg-bg-surface shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-border-base">
        <h3 className="text-lg leading-6 font-medium text-text-base">
          Company Branding & Voice
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Configure colors, fonts, and AI communication style.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-4 sm:mx-6 my-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="mx-4 sm:mx-6 my-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Using RefreshCw for success indication as before */}
              <RefreshCw className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Settings saved successfully</p>
            </div>
          </div>
        </div>
      )}

      {/* --- Form Start --- */}
      <form onSubmit={handleSubmit}>
        <div className="px-4 py-5 sm:p-6">

          {/* Company Identity Section */}
          <h4 className="text-md font-medium text-text-base mb-4">Company Identity</h4>
          <div className="grid grid-cols-6 gap-6">
            {/* Company Name */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="companyName" className="block text-sm font-medium text-text-muted">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                id="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="form-input mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>
            {/* Industry */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="industry" className="block text-sm font-medium text-text-muted">
                Industry
              </label>
              <input
                type="text"
                name="industry"
                id="industry"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="Technology, Healthcare, etc."
                className="form-input mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>
            {/* Key Values */}
            <div className="col-span-6">
              <label htmlFor="keyValues" className="block text-sm font-medium text-text-muted">
                Key Values & Principles
              </label>
              <textarea
                name="keyValues"
                id="keyValues"
                rows="3"
                value={formData.keyValues}
                onChange={handleInputChange}
                placeholder="Describe core values (e.g., innovation, integrity)"
                className="form-textarea mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              ></textarea>
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
              <label htmlFor="primaryColor" className="block text-sm font-medium text-text-muted">
                Primary Color
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  name="primaryColor"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"
                />
                <input
                  type="text"
                  name="primaryColor" // Keep name same for shared state update
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  title="Enter a valid hex color code (e.g., #FF5733)"
                  className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                  placeholder="#3B82F6"
                />
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Main color for headers, buttons, accents.
              </p>
            </div>
             {/* Secondary Color */}
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-text-muted">
                Secondary Color
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  name="secondaryColor"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                   className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"
                />
                <input
                  type="text"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  title="Enter a valid hex color code (e.g., #2563EB)"
                  className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                  placeholder="#2563EB"
                />
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Used for gradients and highlights.
              </p>
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
                <label htmlFor="fontColorDark" className="block text-sm font-medium text-text-muted">
                    Base Text (Dark)
                </label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="fontColorDark" id="fontColorDark" value={formData.fontColorDark} onChange={handleInputChange} className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                    <input type="text" name="fontColorDark" value={formData.fontColorDark} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (#1F2937)" className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm" placeholder="#1F2937"/>
                </div>
                 <p className="mt-1 text-xs text-text-muted">Default text on light backgrounds.</p>
            </div>
            {/* Font Color Light (Inverted Text) */}
             <div className="col-span-6 sm:col-span-2">
                <label htmlFor="fontColorLight" className="block text-sm font-medium text-text-muted">
                    Inverted Text (Light)
                </label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="fontColorLight" id="fontColorLight" value={formData.fontColorLight} onChange={handleInputChange} className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                    <input type="text" name="fontColorLight" value={formData.fontColorLight} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (#FFFFFF)" className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm" placeholder="#FFFFFF"/>
                </div>
                 <p className="mt-1 text-xs text-text-muted">Text on dark/colored backgrounds (e.g., sidebar, buttons).</p>
            </div>
             {/* Font Color Accent */}
             <div className="col-span-6 sm:col-span-2">
                <label htmlFor="fontColorAccent" className="block text-sm font-medium text-text-muted">
                    Accent Text
                </label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="fontColorAccent" id="fontColorAccent" value={formData.fontColorAccent} onChange={handleInputChange} className="h-10 w-10 p-0 border border-border-muted rounded-md shadow-sm cursor-pointer"/>
                    <input type="text" name="fontColorAccent" value={formData.fontColorAccent} onChange={handleInputChange} pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" title="Enter hex code (e.g., #3B82F6)" className="form-input ml-2 flex-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm" placeholder="#3B82F6"/>
                </div>
                 <p className="mt-1 text-xs text-text-muted">Color for links or emphasized text. Defaults to Primary Color.</p>
            </div>

            {/* Revert to Default Button */}
            <div className="col-span-6 pt-2">
              <button
                type="button"
                onClick={handleRevertColors}
                className="inline-flex items-center px-3 py-2 border border-border-base shadow-sm text-sm leading-4 font-medium rounded-md text-text-muted bg-bg-surface hover:bg-bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Revert Colors to Default
              </button>
            </div>
          </div>


            {/* --- COLOR PREVIEW SECTION --- */}
             <div className="col-span-6 mt-8">
                <label className="block text-sm font-medium text-text-muted mb-2">
                    Color Preview
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* UI Elements Preview */}
                    <div className="p-4 rounded-md shadow-sm border border-border-base bg-bg-surface">
                        <h5 className="text-sm font-medium mb-3 text-text-base">UI Elements</h5>
                        <div className="space-y-3">
                            {/* Primary Button */}
                            <button type="button" className="px-3 py-1.5 rounded text-on-primary bg-primary hover:bg-primary-hover text-sm font-medium transition-colors">
                                Primary Button
                            </button>
                             {/* Secondary Button */}
                             <button type="button" className="px-3 py-1.5 rounded text-on-secondary bg-secondary hover:bg-secondary-hover text-sm font-medium transition-colors ml-2">
                                Secondary Button
                            </button>
                            {/* Accent Button */}
                             <button type="button" className="px-3 py-1.5 rounded text-on-accent bg-accent hover:bg-accent-hover text-sm font-medium transition-colors ml-2">
                                Accent Button
                            </button>

                             {/* Gradient Bar */}
                            <div className="h-8 rounded bg-gradient-brand"></div>

                            {/* Text Examples */}
                            <div className="flex items-center">
                                <div className="h-5 w-5 rounded-full mr-2 bg-primary"></div>
                                <span className="text-sm text-text-base">Base text color</span>
                            </div>
                             <div className="flex items-center">
                                <div className="h-5 w-5 rounded-full mr-2 bg-accent"></div>
                                <span className="text-sm text-text-accent">Accent text color (link color)</span>
                            </div>
                            <div className="p-2 rounded bg-primary">
                                <span className="text-sm text-on-primary">Text on primary background</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Preview */}
                    <div className="p-4 rounded-md shadow-sm border border-border-base bg-bg-surface">
                         <h5 className="text-sm font-medium mb-3 text-text-base">Sidebar Preview</h5>
                        <div className="rounded-lg h-36 p-3 text-on-primary bg-gradient-sidebar">
                            {/* Sidebar Header */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface text-primary text-xs font-bold">
                                    P {/* Could use company initial? */}
                                </div>
                                <span className="text-md font-bold text-on-primary">{formData.companyName || 'Pulse360'}</span>
                            </div>
                             {/* Sidebar Item (Active) */}
                            <div className="flex gap-2 items-center text-sm p-1.5 rounded-md bg-white/20 text-on-primary font-medium">
                               <Home className="w-4 h-4"/> {/* Example Icon */}
                                <span>Dashboard</span>
                            </div>
                             {/* Sidebar Item (Inactive) */}
                             <div className="flex gap-2 items-center text-sm p-1.5 rounded-md text-on-primary/90 hover:bg-white/10">
                               <Settings className="w-4 h-4"/> {/* Example Icon */}
                                <span>Settings</span>
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
              <label htmlFor="tone" className="block text-sm font-medium text-text-muted">
                Tone
              </label>
              <select
                id="tone" name="tone" value={formData.tone} onChange={handleInputChange}
                className="form-select mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>
            {/* Formality */}
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="formality" className="block text-sm font-medium text-text-muted">
                Formality Level
              </label>
              <select
                id="formality" name="formality" value={formData.formality} onChange={handleInputChange}
                className="form-select mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              >
                <option value="formal">Formal</option>
                <option value="semiformal">Semi-formal</option>
                <option value="informal">Informal</option>
              </select>
            </div>
             {/* Personality */}
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="personality" className="block text-sm font-medium text-text-muted">
                Personality
              </label>
              <select
                id="personality" name="personality" value={formData.personality} onChange={handleInputChange}
                 className="form-select mt-1 block w-full rounded-md border-border-base shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              >
                <option value="helpful">Helpful</option>
                <option value="innovative">Innovative</option>
                <option value="collaborative">Collaborative</option>
                <option value="direct">Direct</option>
                <option value="empathetic">Empathetic</option>
              </select>
            </div>
          </div>

          {/* AI Preview */}
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="text-sm font-medium text-primary mb-2">Preview: How AI Will Sound</h4>
            <p className="text-sm text-primary/90">
              {/* Dynamic preview based on selections */}
              {formData.tone === 'professional' && "We value your input and appreciate your participation. "}
              {formData.tone === 'friendly' && "We really appreciate your input and participation! "}
              {formData.tone === 'casual' && "Thanks for your input! "}
              {formData.tone === 'enthusiastic' && "We're thrilled to receive your input! "}
              {formData.tone === 'authoritative' && "Your input is valuable. "}

              {formData.formality === 'formal' && "We are here to assist if you have any questions."}
              {formData.formality === 'semiformal' && "We're here to help if you have any questions."}
              {formData.formality === 'informal' && "Let us know if you need any help!"}

              {formData.personality === 'empathetic' && " We understand providing feedback takes time and effort."}
              {formData.personality === 'innovative' && " We're constantly improving this process for you."}
              {formData.personality === 'collaborative' && " Together, we can create meaningful feedback."}
              {formData.personality === 'direct' && " Clear communication makes this process effective."}
              {formData.personality === 'helpful' && " We're here to support you throughout this process."}
            </p>
          </div>
        </div> {/* End main content padding */}

        {/* --- Form Footer/Actions --- */}
        <div className="px-4 py-3 bg-bg-muted text-right sm:px-6 border-t border-border-base">
          <button
            type="submit"
            disabled={saving || loading} // Disable if loading settings too
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-on-primary 
                        ${(saving || loading) ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'} 
                        transition-colors duration-150 ease-in-out`}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
      {/* --- Form End --- */}
    </div>
  );
};

export default BrandingSettings;