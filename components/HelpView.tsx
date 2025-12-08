
import React, { useState } from 'react';
import { Book, User, Briefcase, Shield, CheckCircle, AlertTriangle, Calendar, Clock, Paintbrush, Mail, Settings } from 'lucide-react';

const HelpView = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'worker' | 'supervisor' | 'admin'>('general');

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors ${
        activeTab === id
          ? 'border-blue-600 text-blue-600 bg-blue-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl">
                <Book size={32} />
            </div>
            <div>
                <h1 className="text-2xl font-bold">Centro de Ayuda</h1>
                <p className="text-slate-300">Manual de uso y guía de referencia de GdA RRHH</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          <TabButton id="general" label="Conceptos Básicos" icon={Book} />
          <TabButton id="worker" label="Empleado" icon={User} />
          <TabButton id="supervisor" label="Supervisor" icon={Briefcase} />
          <TabButton id="admin" label="Administrador" icon={Shield} />
        </div>

        {/* Content */}
        <div className="p-8 max-w-4xl mx-auto w-full text-slate-700 leading-relaxed">
          
          {/* --- GENERAL --- */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-fade-in">
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="text-blue-500"/> Acceso y Perfil</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Login:</strong> Acceda con su email corporativo y contraseña. Si no tiene, solicítela a RRHH.</li>
                  <li><strong>Dashboard:</strong> Su panel principal muestra sus días disponibles, saldo de horas, su próximo turno y gráficas de actividad.</li>
                  <li><strong>Perfil:</strong> En el menú "Mi Perfil" puede cambiar su foto (haciendo clic en ella) y actualizar su contraseña.</li>
                </ul>
              </section>

              <hr className="border-slate-100"/>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock className="text-blue-500"/> Conceptos Clave</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2">Solicitudes</h3>
                        <p className="text-sm">Toda petición (vacaciones, horas extra) pasa por un estado <strong>Pendiente</strong> hasta que un supervisor la aprueba.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2">Notificaciones</h3>
                        <p className="text-sm">El icono de la campana le avisará de cambios de estado, mensajes de la empresa o nuevas asignaciones de turno.</p>
                    </div>
                </div>
              </section>
            </div>
          )}

          {/* --- WORKER --- */}
          {activeTab === 'worker' && (
            <div className="space-y-8 animate-fade-in">
               <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Gestión de Ausencias</h2>
                  <p className="mb-4">Para solicitar vacaciones, bajas o días de asuntos propios:</p>
                  <ol className="list-decimal pl-5 space-y-2 font-medium text-slate-800">
                      <li>Pulse el botón azul <strong>"Solicitar Ausencia"</strong> en el Dashboard.</li>
                      <li>Seleccione el tipo y las fechas. El sistema calculará los días automáticamente.</li>
                      <li>Añada un motivo (opcional) y envíe.</li>
                  </ol>
                  <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 border border-yellow-200 flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5"/> 
                      Si desea cancelar una solicitud pendiente, vaya al historial en el Dashboard y pulse el icono de la papelera.
                  </div>
               </section>

               <hr className="border-slate-100"/>

               <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Horas Extra</h2>
                  <p className="mb-2">Desde el botón blanco <strong>"Gestión Horas"</strong> puede:</p>
                  <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-green-500 mt-1"/>
                          <div><strong>Registrar:</strong> Indique cuántas horas extra ha realizado un día concreto para sumarlas a su saldo.</div>
                      </li>
                      <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-blue-500 mt-1"/>
                          <div><strong>Canjear por Días:</strong> Use sus horas acumuladas para pedir días libres. Deberá seleccionar de qué registros previos quiere descontar esas horas.</div>
                      </li>
                      <li className="flex items-start gap-2">
                          <CheckCircle size={18} className="text-purple-500 mt-1"/>
                          <div><strong>Cobrar:</strong> Solicite el abono económico de sus horas acumuladas.</div>
                      </li>
                  </ul>
               </section>
               
               <hr className="border-slate-100"/>

               <section>
                   <h2 className="text-xl font-bold text-slate-900 mb-4">Calendario Visual</h2>
                   <p>Su calendario muestra de forma gráfica sus turnos y ausencias. Los festivos aparecen en rojo. Si tiene unas vacaciones aprobadas, el turno se ocultará para mostrar el icono de vacaciones.</p>
               </section>
            </div>
          )}

          {/* --- SUPERVISOR --- */}
          {activeTab === 'supervisor' && (
             <div className="space-y-8 animate-fade-in">
                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><CheckCircle className="text-green-600"/> Aprobaciones</h2>
                    <p>En el menú <strong>"Aprobaciones"</strong> verá las solicitudes de su equipo.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Puede ver la duración de la solicitud de un vistazo.</li>
                        <li>Al Aprobar o Rechazar, puede añadir un comentario que el empleado leerá.</li>
                    </ul>
                </section>

                <hr className="border-slate-100"/>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Paintbrush className="text-purple-600"/> Planificador de Turnos</h2>
                    <p className="mb-4">Dentro de <strong>"Mi Equipo" {'>'} "Planificación"</strong> encontrará la herramienta visual para asignar turnos.</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold mb-2">Cómo usarlo:</h4>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Seleccione un turno en la barra superior (cada uno tiene un color).</li>
                            <li>Haga clic en las casillas de la cuadrícula para asignar ese turno al empleado y día correspondiente.</li>
                            <li>Use la herramienta "Borrar" para quitar turnos.</li>
                        </ol>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="text-blue-600"/> Calendario de Equipo</h2>
                    <p>Su vista de calendario es detallada. Verá los turnos y las ausencias superpuestas de todo su equipo para asegurar la cobertura del servicio.</p>
                    <p className="mt-2 text-sm text-slate-500">Debajo del calendario, el sistema le avisará en rojo si existen conflictos (múltiples ausencias el mismo día en el mismo departamento).</p>
                </section>
             </div>
          )}

          {/* --- ADMIN --- */}
          {activeTab === 'admin' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                      <p className="text-blue-900 font-medium">Como Administrador, tiene acceso total a todas las funciones anteriores, más el panel de Configuración.</p>
                  </div>

                  <section>
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Gestión de Usuarios</h2>
                      <p>Desde el panel de administración puede Crear, Editar y Borrar usuarios.</p>
                      <ul className="list-disc pl-5 mt-2 space-y-2">
                          <li><strong>Ajustes Manuales:</strong> Puede sumar o restar días/horas al saldo de un empleado manualmente (añadiendo un motivo).</li>
                          <li><strong>Solicitudes Manuales:</strong> Puede crear solicitudes <i>en nombre de</i> un empleado, y decidir si entran como Pendientes o directamente Aprobadas.</li>
                          <li><strong>Historial:</strong> Puede borrar solicitudes del historial. Si borra una aprobada, el sistema <strong>devolverá automáticamente</strong> los saldos al empleado.</li>
                      </ul>
                  </section>

                  <hr className="border-slate-100"/>

                  <section>
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Configuración RRHH</h2>
                      <div className="grid md:grid-cols-3 gap-4">
                          <div className="p-4 border rounded-xl">
                              <h4 className="font-bold text-slate-800">Tipos Ausencia</h4>
                              <p className="text-sm mt-1">Defina qué ausencias restan días y cuáles tienen fechas fijas (ej: Cierre Navidad).</p>
                          </div>
                          <div className="p-4 border rounded-xl">
                              <h4 className="font-bold text-slate-800">Tipos Turno</h4>
                              <p className="text-sm mt-1">Configure colores y horarios para el planificador visual.</p>
                          </div>
                          <div className="p-4 border rounded-xl">
                              <h4 className="font-bold text-slate-800">Festivos</h4>
                              <p className="text-sm mt-1">Añada los días no laborables para que aparezcan en rojo en los calendarios.</p>
                          </div>
                      </div>
                  </section>

                  <hr className="border-slate-100"/>

                  <section>
                      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Mail className="text-slate-600"/> Comunicaciones</h2>
                      <ul className="list-disc pl-5 space-y-2">
                          <li><strong>Plantillas:</strong> Personalice los emails automáticos que envía el sistema.</li>
                          <li><strong>SMTP:</strong> Configure el servidor de correo de la empresa.</li>
                          <li><strong>Mensajería Masiva:</strong> Envíe notificaciones a todos los empleados o a una selección específica directamente a su panel.</li>
                      </ul>
                  </section>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HelpView;
