import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientLayout } from "@/components/layout/ClientLayout";

const ClientPricing = () => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["public_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").eq('is_active', true).order("price");
      if (error) throw error;
      return data;
    },
  });

  const { data: adminPhone } = useQuery({
    queryKey: ['studio_phone'],
    queryFn: async () => {
      const { data } = await supabase.from('studio_info').select('value').eq('key', 'phone').single();
      return data?.value || '';
    }
  });

  const buyViaWhatsApp = (planName: string) => {
    if (!adminPhone) return;
    const text = `Здравствуйте! Хочу купить абонемент "${planName}".`;
    window.open(`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <ClientLayout>
      <div className="space-y-4 pb-20 px-4">
        <h1 className="text-xl font-bold pt-4">Тарифы</h1>
        {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary"/></div> : 
          plans?.map((plan: any) => (
            <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="text-3xl font-extrabold text-primary my-2">{plan.price.toLocaleString()} ₸</div>
              
              {/* Описание фич из поля description */}
              <div className="space-y-2 mb-6">
                  {plan.description?.split('\n').map((line: string, i: number) => (
                      <div key={i} className="flex items-start text-sm text-gray-600">
                          <Check className="h-4 w-4 mr-2 text-green-600 mt-0.5 shrink-0"/>
                          <span>{line.replace(/^-/, '')}</span>
                      </div>
                  ))}
                  <div className="flex items-center text-sm text-gray-600 font-medium pt-2 border-t mt-2">
                      <Check className="h-4 w-4 mr-2 text-green-600"/>
                      {plan.visits_count ? `${plan.visits_count} занятий` : "Безлимитное посещение"}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 mr-2 text-green-600"/>
                      Срок {plan.duration_days} дней
                  </div>
              </div>

              <Button className="w-full rounded-xl h-12" onClick={() => buyViaWhatsApp(plan.name)} disabled={!adminPhone}>
                  Купить через WhatsApp
              </Button>
            </div>
          ))
        }
      </div>
    </ClientLayout>
  );
};
export default ClientPricing;