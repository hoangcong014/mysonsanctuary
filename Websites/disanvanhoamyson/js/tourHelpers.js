// tourHelpers.js
(function() {
    'use strict';
    
    // Đợi tour load xong
    function waitForTour(callback) {
        if (window.tour && window.tour._getRootPlayer) {
            callback();
        } else {
            setTimeout(() => waitForTour(callback), 100);
        }
    }
    
    waitForTour(function() {
        // Export ra global scope
        window.TourHelpers = {
            // ==================== MEDIA & LANGUAGE ====================
            getCurrentMediaName: function() {
                const rootPlayer = window.tour._getRootPlayer();
                const mainViewer = rootPlayer.MainViewer;
                const currentMedia = rootPlayer.getActiveMediaWithViewer(mainViewer);
                return currentMedia.get('label');
            },
            
            getCurrentLanguage: function() {
                return window.tour.locManager.currentLocaleID;
            },
            
            // ==================== ẨN HIỆN COMPONENT BY TAGS ====================
            setVisibilityByTags: function(tags, visible, applyToChildren = false) {
                // Auto-convert string thành array
                if (typeof tags === 'string') {
                    tags = [tags];
                }
                
                // Sử dụng API của 3DVista
                window.tour.setComponentsVisibilityByTags(tags, visible, applyToChildren);
                
                // Return số lượng components bị ảnh hưởng
                const rootPlayer = window.tour._getRootPlayer();
                const components = rootPlayer.getComponentsByTags(tags, applyToChildren);
                
                console.log(`${visible ? 'Showed' : 'Hid'} ${components.length} component(s) with tags: ${tags.join(', ')}`);
                
                return components.length;
            },
            
            showByTags: function(tags, applyToChildren = false) {
                return this.setVisibilityByTags(tags, true, applyToChildren);
            },
            
            hideByTags: function(tags, applyToChildren = false) {
                return this.setVisibilityByTags(tags, false, applyToChildren);
            },
            
            toggleByTags: function(tags, applyToChildren = false) {
                if (typeof tags === 'string') {
                    tags = [tags];
                }
                
                const rootPlayer = window.tour._getRootPlayer();
                const components = rootPlayer.getComponentsByTags(tags, applyToChildren);
                
                components.forEach(component => {
                    const currentVisible = component.get('visible');
                    component.set('visible', !currentVisible);
                });
                
                console.log(`Toggled ${components.length} component(s) with tags: ${tags.join(', ')}`);
                
                return components.length;
            },
            
            // ==================== GET COMPONENTS BY TAGS ====================
            getComponentsByTags: function(tags, returnType = 'elements') {
                // Auto-convert string thành array
                if (typeof tags === 'string') {
                    tags = [tags];
                }
                
                const rootPlayer = window.tour._getRootPlayer();
                const components = rootPlayer.getComponentsByTags(tags);
                
                // Return theo type
                switch(returnType) {
                    case 'components':
                        // Trả về components của 3DVista
                        return components;
                        
                    case 'elements':
                        // Trả về DOM elements
                        return components.map(component => {
                            return component.xa?.[0] || component.Cx?.[0] || component.nc || null;
                        }).filter(el => el !== null);
                        
                    case 'full':
                        // Trả về object đầy đủ
                        return components.map(component => ({
                            id: component.get('id'),
                            name: component.get('name'),
                            label: component.get('label'),
                            tags: component.get('tags'),
                            visible: component.get('visible'),
                            component: component,
                            element: component.xa?.[0] || component.Cx?.[0] || component.nc
                        }));
                        
                    default:
                        return components.map(component => {
                            return component.xa?.[0] || component.Cx?.[0] || component.nc || null;
                        }).filter(el => el !== null);
                }
            },
            
            // ==================== GET COMPONENT BY NAME ====================
            getComponentByName: function(name, returnType = 'element') {
                const rootPlayer = window.tour._getRootPlayer();
                const component = rootPlayer.getComponentByName(name);
                
                if (!component) {
                    console.warn(`Component with name "${name}" not found`);
                    return null;
                }
                
                // Return theo type
                switch(returnType) {
                    case 'component':
                        // Trả về component của 3DVista
                        return component;
                        
                    case 'element':
                        // Trả về DOM element
                        return component.xa?.[0] || component.Cx?.[0] || component.nc || null;
                        
                    case 'full':
                        // Trả về object đầy đủ
                        return {
                            id: component.get('id'),
                            name: component.get('name'),
                            label: component.get('label'),
                            tags: component.get('tags'),
                            visible: component.get('visible'),
                            component: component,
                            element: component.xa?.[0] || component.Cx?.[0] || component.nc
                        };
                        
                    default:
                        return component.xa?.[0] || component.Cx?.[0] || component.nc || null;
                }
            },
            
            // ==================== HELPER FUNCTIONS ====================
            // List tất cả tags trong tour
            listAllTags: function() {
                const rootPlayer = window.tour._getRootPlayer();
                const allTags = new Set();
                const taggedComponents = [];
                
                for (let key in rootPlayer) {
                    const component = rootPlayer[key];
                    
                    if (component && typeof component.get === 'function') {
                        try {
                            const tags = component.get('tags');
                            if (tags && tags.length > 0) {
                                tags.forEach(tag => allTags.add(tag));
                                taggedComponents.push({
                                    id: key,
                                    name: component.get('name') || '',
                                    label: component.get('label') || '',
                                    tags: tags.join(', ')
                                });
                            }
                        } catch(e) {}
                    }
                }
                
                console.log('All tags:', Array.from(allTags));
                console.table(taggedComponents);
                
                return {
                    tags: Array.from(allTags),
                    components: taggedComponents
                };
            },
            
            // List tất cả names trong tour
            listAllNames: function() {
                const rootPlayer = window.tour._getRootPlayer();
                const names = [];
                
                for (let key in rootPlayer) {
                    const component = rootPlayer[key];
                    
                    if (component && typeof component.get === 'function') {
                        try {
                            const name = component.get('name');
                            if (name) {
                                names.push({
                                    id: key,
                                    name: name,
                                    label: component.get('label') || '',
                                    tags: (component.get('tags') || []).join(', ')
                                });
                            }
                        } catch(e) {}
                    }
                }
                
                console.table(names);
                return names;
            }
        };
        
        console.log('TourHelpers loaded ✓');
        console.log('Available functions:');
        console.log('  • getCurrentMediaName()');
        console.log('  • getCurrentLanguage()');
        console.log('  • showByTags(tags) / hideByTags(tags) / toggleByTags(tags)');
        console.log('  • getComponentsByTags(tags, returnType)');
        console.log('  • getComponentByName(name, returnType)');
        console.log('  • listAllTags() / listAllNames()');
    });
})();