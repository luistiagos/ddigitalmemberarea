import { useState } from 'react';
import { Download, Monitor, Smartphone } from 'lucide-react';

export function PtBrAccess() {
  const [activeTab, setActiveTab] = useState('pc'); // 'pc' or 'mobile'

  return (
    <div className="min-h-screen bg-[#0A0F16] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Dynamic Keyframes Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 135, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(0, 255, 135, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 135, 0); }
        }
        .pulse-glow-btn {
          animation: pulse-glow 2s infinite;
        }
        .animate-float-slow {
          animation: float 6s ease-in-out infinite;
        }
      `}} />

      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00FF87]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FFD700]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Container */}
      <div className="flex-grow flex items-center justify-center px-4 py-16 sm:py-24 relative z-10">
        <div className="w-full max-w-[800px] flex flex-col items-center">

          {/* Header Section */}
          <div className="text-center mb-12 w-full animate-fade-in">
            <div className="inline-block bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-float-slow">
              Coleção Completa de Figurinhas 2026
            </div>

            <h1
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-[#00FF87] to-[#FFD700] bg-clip-text text-transparent leading-tight py-1"
            >
              Seu Download está Pronto
            </h1>
            <p className="text-[#A0AAB5] text-base sm:text-lg max-w-xl mx-auto mb-8 font-normal">
              Clique no botão abaixo para baixar o arquivo ZIP completo contendo o seu trofeu.
            </p>

            <a
              href="https://huggingface.co/datasets/luistiagos/products/resolve/main/trofeu.zip"
              className="pulse-glow-btn inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base sm:text-lg font-bold text-[#0A0F16] bg-gradient-to-r from-[#00FF87] to-[#00D16F] rounded-xl shadow-[0_4px_15px_rgba(0,255,135,0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all uppercase tracking-wider cursor-pointer"
              download
            >
              <Download size={22} className="stroke-[2.5px]" />
              Baixar Arquivo ZIP
            </a>
          </div>

          {/* Instructions Card */}
          <div className="w-full bg-[#141C27] rounded-[24px] p-6 sm:p-10 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:border-white/10">
            <h2
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
              className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 tracking-wide"
            >
              Como extrair e acessar seus arquivos
            </h2>

            {/* Tabs */}
            <div className="flex gap-3 mb-8 justify-center flex-wrap">
              <button
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm sm:text-base font-semibold cursor-pointer transition-all border ${activeTab === 'pc'
                  ? 'bg-[#00FF87] text-[#0A0F16] border-[#00FF87] font-bold shadow-[0_0_12px_rgba(0,255,135,0.25)]'
                  : 'bg-transparent text-[#A0AAB5] border-white/10 hover:bg-white/5 hover:text-white'
                  }`}
                onClick={() => setActiveTab('pc')}
              >
                <Monitor size={18} />
                PC / Mac
              </button>
              <button
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm sm:text-base font-semibold cursor-pointer transition-all border ${activeTab === 'mobile'
                  ? 'bg-[#00FF87] text-[#0A0F16] border-[#00FF87] font-bold shadow-[0_0_12px_rgba(0,255,135,0.25)]'
                  : 'bg-transparent text-[#A0AAB5] border-white/10 hover:bg-white/5 hover:text-white'
                  }`}
                onClick={() => setActiveTab('mobile')}
              >
                <Smartphone size={18} />
                Celular / Tablet
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-4">
              {activeTab === 'pc' && (
                <>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      1. Baixe o arquivo ZIP usando o botão acima.
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      2. Assim que o download terminar, localize o arquivo na sua pasta 'Downloads'.
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      3. Clique com o botão direito no arquivo e selecione 'Extrair Tudo...' (Windows) ou dê um duplo clique para expandir (Mac). Você também pode usar WinRAR ou 7-Zip.
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      4. Abra a pasta extraída. Dentro dela, você encontrará todos os PDFs organizados por país. É só abrir qualquer PDF e imprimir!
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'mobile' && (
                <>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      1. Toque no botão de download acima e aguarde o término do download do arquivo ZIP.
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      2. Abra o aplicativo gerenciador de arquivos do seu dispositivo (ex: 'Arquivos' no iOS ou 'Files do Google' / 'Meus Arquivos' no Android).
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      3. Navegue até a pasta 'Downloads' e toque no arquivo ZIP.
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      4. Toque em 'Extrair' ou 'Descompactar'. Se o seu aplicativo não suportar, você pode instalar o 'ZArchiver' na Play Store ou 'iZip' na App Store.
                    </p>
                  </div>
                  <div className="bg-black/20 p-5 rounded-xl border-l-4 border-[#00FF87] transition-all hover:bg-black/30 hover:translate-x-1 duration-200">
                    <p className="text-white text-[1rem] leading-relaxed">
                      5. Após extrair, entre na nova pasta e toque em qualquer arquivo PDF para visualizar e imprimir.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center p-8 border-t border-white/5 text-[#A0AAB5] mt-auto">
        <p className="text-sm">
          © 2026 Coleção Digital do Campeonato Mundial de Futebol. Todos os direitos reservados.
        </p>
        <p className="text-xs mt-2 opacity-65">
          Este é um produto digital independente. Não somos afiliados à FIFA ou a nenhuma marca mencionada.
        </p>
      </footer>
    </div>
  );
}
