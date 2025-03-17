// Script para corregir el error de sintaxis en ContentManager.tsx
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'ContentManager.tsx');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar la sección problemática
const problematicSection = `) : (
                                      <div className="text-xs text-gray-500 max-w-xs truncate">
                                        {content.content_type === "video" 
                                          ? content.content 
                                          : content.content.length > 100 
                                            ? content.content.substring(0, 100) + "..." 
                                            : content.content}
                                      </div>
                                      )}`;

const fixedSection = `) : (
                                      <div className="text-xs text-gray-500 max-w-xs truncate">
                                        {content.content_type === "video" 
                                          ? content.content 
                                          : content.content.length > 100 
                                            ? content.content.substring(0, 100) + "..." 
                                            : content.content}
                                      </div>
                                    )}`;

// Reemplazar todas las ocurrencias
content = content.replace(problematicSection, fixedSection);

// Guardar el archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('Archivo ContentManager.tsx corregido exitosamente.');
