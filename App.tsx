
import React, { useState, useEffect, useMemo } from 'react';
import { Group, View, Contact, SendStatus, Toast } from './types';
import { generateSmsDraft } from './services/geminiService';

const INITIAL_MOCK: Contact[] = [
  { id: '1', name: 'أحمد محمد', phoneNumber: '0501234567', source: 'manual' },
  { id: '2', name: 'سارة خالد', phoneNumber: '0559876543', source: 'manual' },
];

const CLOUD_MOCK: Contact[] = [
  { id: 'c1', name: 'فيصل العبدالله', phoneNumber: '0560001112', source: 'cloud' },
  { id: 'c2', name: 'ريما القاسم', phoneNumber: '0544443332', source: 'cloud' },
  { id: 'c3', name: 'طلال الحربي', phoneNumber: '0522221110', source: 'cloud' },
  { id: 'c4', name: 'هيفاء السعيد', phoneNumber: '0588889990', source: 'cloud' },
  { id: 'c5', name: 'سلطان الدوسري', phoneNumber: '0577776665', source: 'cloud' },
  { id: 'c6', name: 'مها الزهراني', phoneNumber: '0509998887', source: 'cloud' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [groups, setGroups] = useState<Group[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>(INITIAL_MOCK);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendingResults, setSendingResults] = useState<SendStatus[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    const savedGroups = localStorage.getItem('sms_groups');
    const savedContacts = localStorage.getItem('sms_contacts');
    
    if (savedGroups) setGroups(JSON.parse(savedGroups));
    if (savedContacts) setAllContacts(JSON.parse(savedContacts));
  }, []);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSyncContacts = async () => {
    setIsLoadingContacts(true);
    try {
      // Logic for real Contact Picker API
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        if (contacts && contacts.length > 0) {
          const formatted: Contact[] = contacts.map((c: any, index: number) => ({
            id: `phone-${Date.now()}-${index}`,
            name: c.name?.[0] || 'بدون اسم',
            phoneNumber: c.tel?.[0] || 'بدون رقم',
            source: 'phone'
          }));
          const updated = [...allContacts, ...formatted];
          setAllContacts(updated);
          localStorage.setItem('sms_contacts', JSON.stringify(updated));
          showToast(`تم استيراد ${contacts.length} جهة اتصال بنجاح`, 'success');
        }
      } else {
        // Advanced Simulation Fallback (Cloud Backup Import)
        await new Promise(r => setTimeout(r, 2000));
        // Add cloud mock if not already added
        const hasCloud = allContacts.some(c => c.source === 'cloud');
        if (!hasCloud) {
          const updated = [...allContacts, ...CLOUD_MOCK];
          setAllContacts(updated);
          localStorage.setItem('sms_contacts', JSON.stringify(updated));
          showToast("تمت المزامنة مع النسخة السحابية بنجاح", "success");
        } else {
          showToast("جهات الاتصال محدثة بالفعل", "info");
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
      showToast("حدث خطأ أثناء المزامنة", "error");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return allContacts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phoneNumber.includes(searchTerm)
    );
  }, [allContacts, searchTerm]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedContacts.length === 0) {
      showToast("يرجى إدخال اسم المجموعة واختيار جهة واحدة على الأقل", "error");
      return;
    }
    
    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName,
      contacts: allContacts.filter(c => selectedContacts.includes(c.id)),
      createdAt: Date.now()
    };
    
    const updated = [...groups, newGroup];
    setGroups(updated);
    localStorage.setItem('sms_groups', JSON.stringify(updated));
    setNewGroupName('');
    setSelectedContacts([]);
    setSearchTerm('');
    setCurrentView('groups');
    showToast("تم إنشاء المجموعة بنجاح", "success");
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  // Fix: Implemented the missing toggleContactSelection function
  const toggleContactSelection = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const deleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    localStorage.setItem('sms_groups', JSON.stringify(updated));
    if (selectedGroupId === id) setSelectedGroupId('');
    showToast("تم حذف المجموعة", "info");
  };

  const handleSendSms = async () => {
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group || !message.trim()) return;

    setShowConfirmModal(false);
    setIsSending(true);
    setSendingResults([]);

    const results: SendStatus[] = [];
    for (const contact of group.contacts) {
      await new Promise(r => setTimeout(r, 600));
      results.push({
        contactName: contact.name,
        phoneNumber: contact.phoneNumber,
        status: Math.random() > 0.1 ? 'success' : 'failed'
      });
      setSendingResults([...results]);
    }
    setIsSending(false);
    setCurrentView('history');
    showToast("اكتملت عملية الإرسال الجماعي", "success");
  };

  const handleAiDraft = async () => {
    if (!message.trim()) return;
    setIsGenerating(true);
    const draft = await generateSmsDraft(message);
    setMessage(draft);
    setIsGenerating(false);
    showToast("تم تحسين الرسالة بالذكاء الاصطناعي", "info");
  };

  return (
    <div className="mobile-frame flex flex-col h-screen overflow-hidden border-x border-gray-200">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-xs font-bold z-[200] shadow-xl animate-in fade-in slide-in-from-bottom-4 transition-all ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white text-gray-900 px-4 py-5 flex items-center justify-between z-10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {currentView !== 'home' && (
            <button onClick={() => setCurrentView('home')} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
              <span className="text-xl">←</span>
            </button>
          )}
          <h1 className="text-lg font-black tracking-tight">رَسائلي <span className="text-blue-600">SMART</span></h1>
        </div>
        <button onClick={handleSyncContacts} disabled={isLoadingContacts} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isLoadingContacts ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
          {isLoadingContacts ? <span className="animate-spin text-sm">⏳</span> : '🔄 مزامنة'}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 bg-[#fafafa]">
        
        {currentView === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-4">اختيار المستلمين</label>
              <div className="relative">
                <select 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full p-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 focus:border-blue-500/30 focus:bg-white outline-none appearance-none cursor-pointer transition-all font-bold text-gray-700"
                >
                  <option value="">-- اختر مجموعة اتصال --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.contacts.length} عضو)</option>
                  ))}
                </select>
                <div className="absolute left-4 top-5 pointer-events-none opacity-40">▼</div>
              </div>
              {groups.length === 0 && (
                <button onClick={() => setCurrentView('create-group')} className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all">
                  + أنشئ مجموعتك الأولى الآن
                </button>
              )}
            </div>

            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
              <div className="flex justify-between mb-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">رسالتك</label>
                <button 
                  onClick={handleAiDraft}
                  disabled={isGenerating || !message.trim()}
                  className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-black hover:bg-indigo-100 disabled:opacity-30"
                >
                  {isGenerating ? 'جاري التحسين...' : '✨ تحسين المحتوى'}
                </button>
              </div>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                rows={5}
                className="w-full p-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 focus:border-blue-500/30 focus:bg-white outline-none resize-none text-sm transition-all"
              />
              <div className="flex justify-end mt-2">
                <span className={`text-[10px] font-black ${message.length > 160 ? 'text-red-500' : 'text-gray-300'}`}>
                  {message.length} / 160
                </span>
              </div>
            </div>

            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={!selectedGroupId || !message.trim() || isSending}
              className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isSending ? 'جاري الإرسال الجماعي...' : (
                <>
                  <span>إطلاق الرسائل</span>
                  <span className="text-xl">🚀</span>
                </>
              )}
            </button>
          </div>
        )}

        {currentView === 'groups' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="text-2xl font-black text-gray-900">مجموعاتك</h2>
                <p className="text-xs text-gray-400 font-bold">لديك {groups.length} قوائم مجهزة</p>
              </div>
              <button 
                onClick={() => setCurrentView('create-group')}
                className="bg-gray-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
            {groups.length === 0 ? (
              <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-200 text-center space-y-4">
                <div className="text-4xl">📁</div>
                <p className="text-sm text-gray-400 font-bold">لا توجد قوائم إرسال حالياً.</p>
                <button onClick={() => setCurrentView('create-group')} className="text-blue-600 text-xs font-black underline underline-offset-4">ابدأ بإضافة أول قائمة</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {groups.map(group => (
                  <div key={group.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex justify-between items-center hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black">
                        {group.contacts.length}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-sm">{group.name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold">أنشئت في {new Date(group.createdAt).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteGroup(group.id)}
                      className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'create-group' && (
          <div className="space-y-5 animate-in slide-in-from-right-8 duration-500">
            <div className="space-y-1">
              <h2 className="text-2xl font-black">قائمة جديدة</h2>
              <p className="text-xs text-gray-400 font-bold">اختر الأسماء التي ترغب في إرسال الرسائل إليها</p>
            </div>
            
            <input 
              type="text"
              placeholder="اسم المجموعة (مثلاً: زبائن الجمعة)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full p-5 border-2 border-gray-50 rounded-2xl outline-none focus:border-blue-500/20 bg-white font-bold text-sm shadow-sm"
            />

            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 space-y-4">
                 <div className="relative">
                    <input 
                      type="text"
                      placeholder="ابحث بالاسم أو الرقم..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-3.5 pr-11 border-2 border-white rounded-2xl text-sm focus:border-blue-100 outline-none shadow-inner font-medium"
                    />
                    <span className="absolute right-4 top-3.5 opacity-20 text-xl">🔍</span>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      تم اختيار {selectedContacts.length} من {filteredContacts.length}
                    </p>
                    <button 
                      onClick={toggleSelectAll}
                      className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full"
                    >
                      {selectedContacts.length === filteredContacts.length ? 'إلغاء الكل' : 'اختيار الكل'}
                    </button>
                 </div>
              </div>
              
              <div className="max-h-[380px] overflow-y-auto">
                {isLoadingContacts ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-[3px] border-blue-600 border-t-transparent"></div>
                    <p className="text-xs text-gray-400 font-black">جاري جلب جهات الاتصال...</p>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="p-12 text-center text-gray-300 font-bold text-sm">
                    لا توجد نتائج بحث
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContacts.includes(contact.id);
                    return (
                      <div 
                        key={contact.id} 
                        onClick={() => toggleContactSelection(contact.id)}
                        className={`flex items-center p-4 cursor-pointer border-b border-gray-50 last:border-0 transition-all ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm ml-4 transition-all ${isSelected ? 'bg-blue-600 text-white rotate-6' : 'bg-gray-100 text-gray-500'}`}>
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-gray-800">{contact.name}</p>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${contact.source === 'phone' ? 'bg-green-100 text-green-600' : contact.source === 'cloud' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                              {contact.source}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono tracking-tight">{contact.phoneNumber}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-2 transition-all ${isSelected ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white border-gray-200'}`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <button 
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedContacts.length === 0}
              className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black shadow-xl shadow-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none transition-all active:scale-95"
            >
              حفظ القائمة الجديدة
            </button>
          </div>
        )}

        {currentView === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-left-8 duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black">تقرير التسليم</h2>
              <button onClick={() => setCurrentView('home')} className="text-blue-600 text-xs font-black bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">إرسال جديد</button>
            </div>
            <div className="space-y-3">
              {sendingResults.map((res, i) => (
                <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${res.status === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="text-sm font-black text-gray-800">{res.contactName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{res.phoneNumber}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider ${res.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {res.status === 'success' ? 'تم الوصول' : 'فشل التسليم'}
                  </span>
                </div>
              ))}
              {sendingResults.length === 0 && (
                <div className="text-center py-20 opacity-30">
                  <div className="text-5xl mb-4">📊</div>
                  <p className="text-sm font-black">السجل فارغ حالياً</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around p-4 pb-8 z-10">
        {[
          { id: 'home', icon: '✉️', label: 'الرئيسية' },
          { id: 'groups', icon: '👥', label: 'المجموعات' },
          { id: 'history', icon: '📊', label: 'التقارير' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setCurrentView(item.id as View)} 
            className={`flex flex-col items-center transition-all px-6 py-2 rounded-2xl ${currentView === item.id ? 'text-blue-600 bg-blue-50/50 scale-105' : 'text-gray-300 hover:text-gray-500'}`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center p-6 z-[300] backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm p-8 rounded-[40px] shadow-2xl text-right animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center text-3xl mb-6">📢</div>
            <h3 className="text-2xl font-black mb-2 text-gray-900">تأكيد الإطلاق</h3>
            <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">
              سيتم إرسال الرسالة إلى 
              <span className="font-black text-blue-600 mx-1 underline decoration-2 underline-offset-4">
                {groups.find(g => g.id === selectedGroupId)?.contacts.length}
              </span> 
              شخص في المجموعة المحددة.
              <br/>
              <span className="text-[10px] text-gray-400 mt-2 block font-bold">* تأكد من وجود رصيد SMS كافي في شريحتك.</span>
            </p>
            <div className="flex gap-4">
              <button 
                onClick={handleSendSms}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-transform"
              >
                إرسال الآن
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl font-black active:scale-95 transition-transform"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
