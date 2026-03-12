import re

filepath = r"c:\app-\streaming-app\frontend\src\components\AdminDashboard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Helper block for the combobox ui
combobox_ui = """
<div className="admin-form-group">
    <label className="admin-form-label">Series Title</label>
    <Popover open={@@OPEN_STATE@@} onOpenChange={@@SET_OPEN_STATE@@}>
        <PopoverTrigger asChild>
            <button
                type="button"
                className="admin-form-input"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                {@@VALUE_STATE@@ || 'Select or type a series...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
            <Command style={{ backgroundColor: '#1a1a1a' }}>
                <CommandInput 
                    placeholder="Search series..." 
                    value={@@VALUE_STATE@@}
                    onValueChange={@@SET_VALUE_STATE@@}
                    style={{ color: 'white' }}
                />
                <CommandEmpty style={{ color: '#aaa', padding: '10px' }}>
                    Type to add new series "{@@VALUE_STATE@@}"
                </CommandEmpty>
                <CommandGroup>
                    <CommandList>
                        {existingSeries.map((s) => (
                            <CommandItem
                                key={s}
                                value={s}
                                onSelect={(currentValue) => {
                                    @@SET_VALUE_STATE@@(currentValue);
                                    @@SET_OPEN_STATE@@(false);
                                }}
                                style={{ color: 'white', cursor: 'pointer' }}
                            >
                                <Check
                                    className={`mr-2 h-4 w-4 ${@@VALUE_STATE@@ === s ? 'opacity-100' : 'opacity-0'}`}
                                />
                                {s}
                            </CommandItem>
                        ))}
                    </CommandList>
                </CommandGroup>
            </Command>
        </PopoverContent>
    </Popover>
</div>
<div className="admin-form-group" style={{ display: 'flex', gap: '1rem' }}>
    <div style={{ flex: 1 }}>
        <label className="admin-form-label">Season</label>
        <input className="admin-form-input" type="number" min="1" value={@@SEASON_STATE@@} onChange={e => @@SET_SEASON_STATE@@(parseInt(e.target.value) || 1)} />
    </div>
    <div style={{ flex: 1 }}>
        <label className="admin-form-label">@@EPISODE_LABEL@@</label>
        <input className="admin-form-input" type="number" min="1" value={@@EPISODE_STATE@@} onChange={e => @@SET_EPISODE_STATE@@(parseInt(e.target.value) || 1)} />
    </div>
</div>
"""

# 1. Update Single Upload JSX
old_single_upload = """                                <div className="admin-upload-form-grid">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label" htmlFor="up-title">Video Title (optional)</label>
                                        <input id="up-title" className="admin-form-input" type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Episode 01 - Launch Night" />
                                    </div>"""

new_single_upload = """                                <div className="admin-upload-form-grid">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Content Type</label>
                                        <Select value={uploadContentType} onValueChange={(v: 'movie'|'series') => setUploadContentType(v)}>
                                            <SelectTrigger className="admin-form-input" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                                <SelectValue placeholder="Select content type" />
                                            </SelectTrigger>
                                            <SelectContent style={{ backgroundColor: '#222', borderColor: '#333', color: 'white' }}>
                                                <SelectItem value="movie">Movie / Standalone</SelectItem>
                                                <SelectItem value="series">Series Episode</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {uploadContentType === 'series' && (
                                        <>""" + combobox_ui.replace('@@OPEN_STATE@@', 'uploadComboboxOpen')\
                                                            .replace('@@SET_OPEN_STATE@@', 'setUploadComboboxOpen')\
                                                            .replace('@@VALUE_STATE@@', 'uploadSeriesTitle')\
                                                            .replace('@@SET_VALUE_STATE@@', 'setUploadSeriesTitle')\
                                                            .replace('@@SEASON_STATE@@', 'uploadSeason')\
                                                            .replace('@@SET_SEASON_STATE@@', 'setUploadSeason')\
                                                            .replace('@@EPISODE_LABEL@@', 'Episode')\
                                                            .replace('@@EPISODE_STATE@@', 'uploadEpisode')\
                                                            .replace('@@SET_EPISODE_STATE@@', 'setUploadEpisode') + """
                                        </>
                                    )}

                                    <div className="admin-form-group">
                                        <label className="admin-form-label" htmlFor="up-title">{uploadContentType === 'series' ? 'Episode Title (optional)' : 'Video Title'}</label>
                                        <input id="up-title" className="admin-form-input" type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder={uploadContentType === 'series' ? "e.g., Pilot" : "Video Title"} />
                                    </div>"""
content = content.replace(old_single_upload, new_single_upload)


# 2. Update Bulk Upload JSX
old_bulk_queue = """                            {bulkItems.length > 0 && (
                                <div className="admin-bulk-queue">
                                    {bulkItems.map(item => ("""
                                    
new_bulk_queue = """                            {bulkItems.length > 0 && (
                                <div className="admin-bulk-queue">
                                    <div className="admin-upload-form-grid" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #333' }}>
                                        <div className="admin-form-group">
                                            <label className="admin-form-label">Bulk Content Type</label>
                                            <Select value={bulkContentType} onValueChange={(v: 'movie'|'series') => setBulkContentType(v)} disabled={bulkRunning}>
                                                <SelectTrigger className="admin-form-input" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                                    <SelectValue placeholder="Select content type" />
                                                </SelectTrigger>
                                                <SelectContent style={{ backgroundColor: '#222', borderColor: '#333', color: 'white' }}>
                                                    <SelectItem value="movie">Movies / Standalone</SelectItem>
                                                    <SelectItem value="series">Series Episodes</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {bulkContentType === 'series' && (
                                            <>""" + combobox_ui.replace('@@OPEN_STATE@@', 'bulkComboboxOpen')\
                                                                .replace('@@SET_OPEN_STATE@@', 'setBulkComboboxOpen')\
                                                                .replace('@@VALUE_STATE@@', 'bulkSeriesTitle')\
                                                                .replace('@@SET_VALUE_STATE@@', 'setBulkSeriesTitle')\
                                                                .replace('@@SEASON_STATE@@', 'bulkSeason')\
                                                                .replace('@@SET_SEASON_STATE@@', 'setBulkSeason')\
                                                                .replace('@@EPISODE_LABEL@@', 'Start Episode (Auto-incremented)')\
                                                                .replace('@@EPISODE_STATE@@', 'bulkStartEpisode')\
                                                                .replace('@@SET_EPISODE_STATE@@', 'setBulkStartEpisode') + """
                                            </>
                                        )}
                                    </div>
                                    {bulkItems.map(item => ("""
content = content.replace(old_bulk_queue, new_bulk_queue)


# 3. Update Bulk Row
old_bulk_row = """                                            <input className="admin-form-input compact" value={item.title} onChange={e => updateBulkItem(item.id, { title: e.target.value })} placeholder="Optional title" disabled={bulkRunning} />
                                            <div className="admin-bulk-progress-wrap">"""
                                            
new_bulk_row = """                                            {bulkContentType === 'series' && (
                                                <input className="admin-form-input compact" type="number" value={item.episode || ''} onChange={e => updateBulkItem(item.id, { episode: parseInt(e.target.value) || 1 })} placeholder="Ep" style={{ width: '60px' }} disabled={bulkRunning} />
                                            )}
                                            <input className="admin-form-input compact" value={item.title} onChange={e => updateBulkItem(item.id, { title: e.target.value })} placeholder={bulkContentType === 'series' ? "Optional Ep Title" : "Title"} disabled={bulkRunning} />
                                            <div className="admin-bulk-progress-wrap">"""
content = content.replace(old_bulk_row, new_bulk_row)


# 4. Update Edit Modal JSX
old_edit_modal = """                        <form onSubmit={handleSaveEdit}>
                            <label className="form-label" htmlFor="edit-title-admin">Title</label>
                            <input id="edit-title-admin" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Enter new title" />
                            <label className="form-label" htmlFor="edit-thumbnail-admin" style={{ marginTop: 12 }}>Thumbnail (jpg/png)</label>"""
                            
new_edit_modal = """                        <form onSubmit={handleSaveEdit}>
                            <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Content Type</label>
                                <Select value={editContentType} onValueChange={(v: 'movie'|'series') => setEditContentType(v)}>
                                    <SelectTrigger className="form-input" style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent style={{ backgroundColor: '#222', borderColor: '#333', color: 'white' }}>
                                        <SelectItem value="movie">Movie</SelectItem>
                                        <SelectItem value="series">Series</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {editContentType === 'series' && (
                                <div style={{ marginBottom: '1rem' }}>""" + combobox_ui.replace('@@OPEN_STATE@@', 'editComboboxOpen')\
                                                            .replace('@@SET_OPEN_STATE@@', 'setEditComboboxOpen')\
                                                            .replace('@@VALUE_STATE@@', 'editSeriesTitle')\
                                                            .replace('@@SET_VALUE_STATE@@', 'setEditSeriesTitle')\
                                                            .replace('@@SEASON_STATE@@', 'editSeason')\
                                                            .replace('@@SET_SEASON_STATE@@', 'setEditSeason')\
                                                            .replace('@@EPISODE_LABEL@@', 'Episode')\
                                                            .replace('@@EPISODE_STATE@@', 'editEpisode')\
                                                            .replace('@@SET_EPISODE_STATE@@', 'setEditEpisode') + """
                                </div>
                            )}

                            <label className="form-label" htmlFor="edit-title-admin">{editContentType === 'series' ? 'Episode Title' : 'Title'}</label>
                            <input id="edit-title-admin" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Enter title" />
                            <label className="form-label" htmlFor="edit-thumbnail-admin" style={{ marginTop: 12 }}>Thumbnail (jpg/png)</label>"""
content = content.replace(old_edit_modal, new_edit_modal)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"File updated successfully")
