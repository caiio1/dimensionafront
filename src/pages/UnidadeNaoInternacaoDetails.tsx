/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, MapPin, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { unidadesNaoInternacao } from "@/lib/api";
import {
  UnidadeNaoInternacaoResponse,
  PerguntaFormulario,
  SitioFuncionalResponse,
  CargoSitioResponse,
  CargoUnidadeResponse,
} from "@/types/unidadeNaoInternacao";

// Helpers to safely extract cargo id/label from backend shapes that may vary
function getCargoId(shape: unknown): string | undefined {
  if (!shape || typeof shape !== "object") return undefined;
  const s = shape as Record<string, unknown>;
  if (typeof s.id === "string") return s.id;
  if (typeof s.cargoId === "string") return s.cargoId;
  if (s.cargo && typeof (s.cargo as any).id === "string")
    return (s.cargo as any).id;
  return undefined;
}

function getCargoLabel(shape: unknown): string {
  if (!shape || typeof shape !== "object") return "Cargo";
  const s = shape as Record<string, unknown>;
  if (s.cargo && typeof (s.cargo as any).nome === "string")
    return (s.cargo as any).nome;
  if (typeof s.nome === "string") return s.nome;
  return "Cargo";
}

export default function UnidadeNaoInternacaoDetails() {
  const navigate = useNavigate();
  const { hospitalId, unidadeId } = useParams();
  const { toast } = useToast();
  const [disponiveis, setDisponveis] = useState<Record<string, number>>({});

  const [unidade, setUnidade] = useState<UnidadeNaoInternacaoResponse | null>(
    null
  );
  // Local state to hold sitios loaded from obterSitioPorIdUnidade (server returns data array)
  const [sitiosList, setSitiosList] = useState<SitioFuncionalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("estatisticas");

  // Estados para modais
  const [sitioModalOpen, setSitioModalOpen] = useState(false);
  const [justificativaModalOpen, setJustificativaModalOpen] = useState(false);

  // Estados para formulários
  const [sitioFormData, setSitioFormData] = useState({
    nome: "",
    descricao: "",
    numeroPositions: 1,
  });
  const [editandoSitioId, setEditandoSitioId] = useState<string | null>(null);
  const [sitioCargosForm, setSitioCargosForm] = useState<
    { id?: string; cargoId: string; quantidade_funcionarios: number }[]
  >([]);

  // (availability computed below)

  const [posicaoFormData, setPosicaoFormData] = useState({
    numero: "",
    descricao: "",
  });

  const [justificativaFormData, setJustificativaFormData] = useState({
    justificativa: "",
  });

  const [quantidadesEditaveis, setQuantidadesEditaveis] = useState<
    Record<string, number>
  >({});

  // Compute available slots per cargo based on unidade.cargosUnidade and current sitiosList allocations
  const disponibilidadePorCargo = useMemo(() => {
    const map: Record<string, number> = {};

    const source =
      sitiosList && sitiosList.length > 0
        ? sitiosList
        : unidade?.sitiosFuncionais || [];

    // For each cargoUnidade, compute allocated amount by matching candidate ids across sitio cargos
    for (const cu of unidade?.cargosUnidade || []) {
      const unitTotal = Number(cu.quantidade_funcionarios || 0);

      // candidate ids identifying this cargoUnidade
      const cuIds = new Set<string>();
      if (cu.cargo && (cu.cargo as any).id)
        cuIds.add(String((cu.cargo as any).id));
      if ((cu as any).id) cuIds.add(String((cu as any).id));
      if ((cu as any).cargoId) cuIds.add(String((cu as any).cargoId));

      // sum allocations in sitios (exclude the sitio being edited)
      let allocated = 0;
      for (const s of source) {
        if (editandoSitioId && s.id === editandoSitioId) continue;
        for (const c of s.cargos || []) {
          const sitioIds = new Set<string>();
          if ((c as any).cargoUnidadeId)
            sitioIds.add(String((c as any).cargoUnidadeId));
          if ((c as any).cargoId) sitioIds.add(String((c as any).cargoId));
          if ((c as any).id) sitioIds.add(String((c as any).id));
          if ((c as any).cargo && (c as any).cargo.id)
            sitioIds.add(String((c as any).cargo.id));
          if ((c as any).cargoUnidade && (c as any).cargoUnidade.id)
            sitioIds.add(String((c as any).cargoUnidade.id));
          if (
            (c as any).cargoUnidade &&
            (c as any).cargoUnidade.cargo &&
            (c as any).cargoUnidade.cargo.id
          )
            sitioIds.add(String((c as any).cargoUnidade.cargo.id));

          const intersects = [...cuIds].some((id) => sitioIds.has(id));
          if (intersects) {
            allocated += Number(c.quantidade_funcionarios || 0) || 0;
          }
        }
      }

      const available = Math.max(0, Math.floor(unitTotal - allocated));

      // store availability under all candidate ids so lookups by different keys work
      if (cuIds.size === 0) continue;
      for (const id of cuIds) map[id] = available;
    }

    return map;
  }, [unidade?.cargosUnidade, sitiosList, editandoSitioId]);

  // Count distinct cargos that already have allocations (quantity > 0) across all sitios
  const totalCargosAlocados = useMemo(() => {
    const seen = new Set<string>();
    const source =
      sitiosList && sitiosList.length > 0
        ? sitiosList
        : unidade?.sitiosFuncionais || [];
    for (const s of source) {
      for (const c of s.cargos || []) {
        const cid =
          (c.cargoUnidadeId as string) ||
          (c.cargoId as string) ||
          (c.id as string) ||
          ((c as any).cargo && (c as any).cargo.id);
        const qty = Number(c.quantidade_funcionarios || 0);
        if (cid && qty > 0) seen.add(cid);
      }
    }
    return seen.size;
  }, [sitiosList, unidade?.sitiosFuncionais]);

  // Sum allocated quantities per cargo across all sitios (used to display on the unit card)
  const alocadosPorCargo = useMemo(() => {
    const map: Record<string, number> = {};
    const source =
      sitiosList && sitiosList.length > 0
        ? sitiosList
        : unidade?.sitiosFuncionais || [];
    for (const s of source) {
      for (const c of s.cargos || []) {
        const qty = Number(c.quantidade_funcionarios || 0) || 0;
        // collect candidate ids produced by different backend shapes
        const candidates = new Set<string>();
        if ((c as any).cargoUnidadeId)
          candidates.add(String((c as any).cargoUnidadeId));
        if ((c as any).cargoId) candidates.add(String((c as any).cargoId));
        if ((c as any).id) candidates.add(String((c as any).id));
        if ((c as any).cargo && (c as any).cargo.id)
          candidates.add(String((c as any).cargo.id));
        if ((c as any).cargoUnidade && (c as any).cargoUnidade.id)
          candidates.add(String((c as any).cargoUnidade.id));
        if (
          (c as any).cargoUnidade &&
          (c as any).cargoUnidade.cargo &&
          (c as any).cargoUnidade.cargo.id
        )
          candidates.add(String((c as any).cargoUnidade.cargo.id));

        if (candidates.size === 0) continue;
        for (const id of candidates) {
          map[id] = (map[id] || 0) + qty;
        }
      }
    }
    return map;
  }, [sitiosList, unidade?.sitiosFuncionais]);

  // State to expose disponibilidade (disponíveis) per cargo for UI consumption
  const [disponiveisPorCargo, setDisponiveisPorCargo] = useState<
    Record<string, number>
  >({});

  // Keep `disponiveisPorCargo` in sync with the computed disponibilidadePorCargo
  useEffect(() => {
    setDisponiveisPorCargo(disponibilidadePorCargo || {});
  }, [disponibilidadePorCargo]);

  // Compute simples 'disponiveis' as (cargoUnidade.quantidade_funcionarios - alocados)
  // and expose it in the `disponiveis` state requested by the UI.
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const [index, cu] of (unidade?.cargosUnidade || []).entries()) {
      const cargoKeyFromCargo = getCargoId(cu.cargo);
      const cargoUnidadeId = (cu as any).id;
      const cargoLegacyId = (cu as any).cargoId;
      const cargoId =
        cargoKeyFromCargo ||
        cargoUnidadeId ||
        cargoLegacyId ||
        `cargo-${index}`;

      const alocados =
        alocadosPorCargo[cargoId] ||
        (cargoUnidadeId && alocadosPorCargo[cargoUnidadeId]) ||
        (cargoLegacyId && alocadosPorCargo[cargoLegacyId]) ||
        0;

      const total = Number(cu.quantidade_funcionarios || 0);
      map[cargoId] = Math.max(0, total - alocados);
    }

    setDisponveis(map);
  }, [unidade?.cargosUnidade, alocadosPorCargo]);

  const calcularAnaliseFinanceiraNaoInternacao = () => {
    if (!unidade?.cargosUnidade) return [];

    // Some payloads include richer cargo information (salario, adicionais, carga_horaria)
    // but the declared type only contains id/nome. Create a small local type to
    // safely read optional fields that may be present at runtime.
    type ExtendedCargo = {
      salario?: string | number;
      adicionais_tributos?: string | number;
      carga_horaria?: string | number;
      id?: string;
      nome?: string;
    };

    return unidade.cargosUnidade.map((cargoUnidade, index) => {
      const cargo = cargoUnidade.cargo as ExtendedCargo | undefined;
      const salario =
        parseFloat(String(cargo?.salario ?? "0").replace(",", ".")) || 0;
      const adicionais =
        parseFloat(
          String(cargo?.adicionais_tributos ?? "0").replace(",", ".")
        ) || 0;
      const custoTotalPorFuncionario = salario + adicionais;
      const quantidadeAtual = cargoUnidade.quantidade_funcionarios;
      const cargoId = cargo?.id || cargoUnidade.id || `cargo-${index}`;
      const quantidadeCalculada =
        quantidadesEditaveis[cargoId] ?? quantidadeAtual;
      const custoTotalAtual = quantidadeAtual * custoTotalPorFuncionario;
      const custoTotalCalculado =
        quantidadeCalculada * custoTotalPorFuncionario;
      const variacaoQuantidade = quantidadeCalculada - quantidadeAtual;
      const variacaoPercentual =
        quantidadeAtual > 0
          ? Math.round(
              ((quantidadeCalculada - quantidadeAtual) / quantidadeAtual) * 100
            )
          : 0;
      const variacaoCusto = custoTotalCalculado - custoTotalAtual;
      const cargaHoraria =
        parseFloat(String(cargo?.carga_horaria ?? "40").replace("h", "")) || 40;
      const horasReais = quantidadeAtual * cargaHoraria;
      const horasCalculadas = quantidadeCalculada * cargaHoraria;
      const variacaoHoras = horasCalculadas - horasReais;

      return {
        cargo: cargo?.nome || "N/A",
        cargoId,
        salario,
        adicionais,
        custoTotalPorFuncionario,
        quantidadeAtual,
        custoTotalAtual,
        quantidadeCalculada,
        custoTotalCalculado,
        variacaoQuantidade,
        variacaoPercentual,
        variacaoCusto,
        horasReais,
        horasCalculadas,
        variacaoHoras,
        horasExtrasProjetadas: 0,
      };
    });
  };

  const atualizarQuantidadeEditavel = (cargoId: string, quantidade: number) => {
    setQuantidadesEditaveis((prev) => ({ ...prev, [cargoId]: quantidade }));
  };

  const carregarUnidade = useCallback(async () => {
    if (!unidadeId) return;

    setLoading(true);
    try {
      const response = await unidadesNaoInternacao.obter(unidadeId);
      const unidadeData = response as UnidadeNaoInternacaoResponse;

      // Fetch sitios separately (this endpoint returns { data: [...] })
      const responseSitios = await unidadesNaoInternacao.obterSitioPorIdUnidade(
        unidadeId
      );

      // Normalize sitios' cargo field names: backend may return `cargosSitio` or `cargos`.
      try {
        const normalizedUnidade = {
          ...unidadeData,
          sitiosFuncionais: (unidadeData.sitiosFuncionais || []).map(
            (s: any) => ({
              ...s,
              cargos: s.cargos || s.cargosSitio || [],
            })
          ) as SitioFuncionalResponse[],
        } as UnidadeNaoInternacaoResponse;

        setUnidade(normalizedUnidade);

        // If responseSitios has a data array, map it into our sitiosList state
        let sitiosArray: any[] = [];
        if (Array.isArray(responseSitios)) {
          sitiosArray = responseSitios as any[];
        } else if (responseSitios && typeof responseSitios === "object") {
          sitiosArray = (responseSitios as any).data ?? [];
        }

        const normalizedArray: SitioFuncionalResponse[] = sitiosArray.map(
          (s: any) => ({
            ...s,
            cargos: s.cargos || s.cargosSitio || [],
          })
        );
        setSitiosList(normalizedArray);
      } catch (normErr) {
        console.warn("carregarUnidade: normalization failed", normErr);
        setUnidade(unidadeData);
        // safe fallback if normalization failed
        if (Array.isArray(responseSitios))
          setSitiosList(responseSitios as any[]);
        else if (responseSitios && typeof responseSitios === "object")
          setSitiosList((responseSitios as any).data ?? []);
        else setSitiosList([]);
      }
    } catch (error) {
      console.error("Erro ao carregar unidade:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes da unidade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [unidadeId, toast]);

  useEffect(() => {
    if (unidadeId) {
      carregarUnidade();
    }
  }, [unidadeId, carregarUnidade]);

  // Função para atualizar status de posição

  // Função para lidar com mudança de status de posição

  // Função para confirmar status inativo com justificativa

  // Funções para gerenciar modais
  const abrirModalSitio = (sitioOrEvent?: unknown) => {
    // Se chamado como handler de clique, o argumento será um evento com currentTarget
    const isEvent =
      sitioOrEvent &&
      typeof sitioOrEvent === "object" &&
      "currentTarget" in (sitioOrEvent as Record<string, unknown>);
    type MaybeSitio = {
      id?: string;
      nome?: string;
      descricao?: string;
      numero?: string | number;
    };
    const sitio = isEvent
      ? undefined
      : (sitioOrEvent as MaybeSitio | undefined);

    if (sitio) {
      setSitioFormData({
        nome: sitio.nome || "",
        descricao: sitio.descricao || "",
        numeroPositions: 1,
      });

      // Prefill cargos form by merging unidade.cargosUnidade (available cargos)
      // with existing sitio.cargos (if provided)
      try {
        const available = (unidade?.cargosUnidade ||
          []) as CargoUnidadeResponse[];
        const sitioCargos =
          (sitio as SitioFuncionalResponse)?.cargos ||
          ([] as CargoSitioResponse[]);
        const merged = available.map((a) => {
          const aCargoId = a.cargo?.id || (a as any).cargoId || (a as any).id;
          const found = sitioCargos.find(
            (sc) =>
              sc.cargoUnidadeId === a.id ||
              sc.cargoUnidade?.id === a.id ||
              // cargoUnidade may contain nested cargo
              sc.cargoUnidade?.cargo?.id === aCargoId ||
              sc.cargoUnidadeId === aCargoId ||
              // fallback to matching by nested cargo id
              (sc.cargoUnidade &&
                ((sc.cargoUnidade as any).cargoId === aCargoId ||
                  (sc.cargoUnidade as any).id === aCargoId))
          );
          return {
            id: found ? found.id : undefined,
            cargoId: a.cargo?.id || (a as any).cargoId || (a as any).id,
            quantidade_funcionarios: found
              ? Number(found.quantidade_funcionarios || 0)
              : 0,
          };
        });
        setSitioCargosForm(merged);
      } catch (e) {
        setSitioCargosForm([]);
      }
    } else {
      setSitioFormData({
        nome: "",
        descricao: "",
        numeroPositions: 1,
      });
      // initialize cargos with unidade cargos (zeros)
      const available = (unidade?.cargosUnidade ||
        []) as CargoUnidadeResponse[];
      setSitioCargosForm(
        available.map((a) => ({
          cargoId: a.cargo?.id || (a as any).cargoId || (a as any).id,
          quantidade_funcionarios: 0,
        }))
      );
      // Ensure we're not in edit mode when opening create modal
      setEditandoSitioId(null);
    }
    setSitioModalOpen(true);
  };

  const fecharModalSitio = () => {
    setSitioModalOpen(false);
    setSitioFormData({
      nome: "",
      descricao: "",
      numeroPositions: 1,
    });
    // Clear edit state when closing
    setEditandoSitioId(null);
  };

  // Função para criar sítio funcional
  const criarSitioFuncional = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sitioFormData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do sítio funcional é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // compute numeroPositions from cargos form
    const computedVagas = sitioCargosForm.reduce(
      (s, c) => s + Number(c.quantidade_funcionarios || 0),
      0
    );

    // Validation: ensure no cargo requested exceeds availability
    const overAlloc: {
      cargoId: string;
      requested: number;
      available: number;
    }[] = [];
    for (const item of sitioCargosForm) {
      const requested = Number(item.quantidade_funcionarios || 0);
      const available = disponibilidadePorCargo[item.cargoId] ?? 0;
      if (requested > available) {
        overAlloc.push({ cargoId: item.cargoId, requested, available });
      }
    }

    if (overAlloc.length > 0) {
      const first = overAlloc[0];
      const label =
        (unidade?.cargosUnidade || []).find(
          (cu) => cu.cargo?.id === first.cargoId || cu.id === first.cargoId
        )?.cargo?.nome || first.cargoId;
      toast({
        title: "Vagas insuficientes",
        description: `Tentando alocar ${first.requested} para ${label}, mas só ${first.available} disponível(s). Ajuste as quantidades.`,
        variant: "destructive",
      });
      return;
    }

    if (computedVagas < 1) {
      toast({
        title: "Erro",
        description: "Preencha ao menos uma vaga em algum cargo",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build payload including cargos array so backend can create/update in one request
      const payload: Record<string, unknown> = {
        unidadeId: unidadeId!,
        nome: sitioFormData.nome.trim(),
        descricao: sitioFormData.descricao,
        numeroPositions: computedVagas,
        cargos: sitioCargosForm
          .map((c) => ({
            cargoUnidadeId: c.id || undefined,
            cargoId: c.cargoId,
            quantidade_funcionarios: Number(c.quantidade_funcionarios || 0),
          }))
          .filter((c) => c.quantidade_funcionarios > 0),
      };

      let sitioResult: Record<string, any> | null = null;
      if (editandoSitioId) {
        // Atualizar (backend faz replace dos cargos quando receber cargos no body)
        try {
          sitioResult = await unidadesNaoInternacao.atualizarSitio(
            unidadeId!,
            editandoSitioId,
            payload
          );
          toast({ title: "Sucesso", description: "Sítio atualizado" });
        } catch (updateErr) {
          console.error("atualizarSitio failed:", updateErr);
          // Fallback: some backend versions reject a PUT containing cargos. Retry
          // updating the sitio without cargos, then sync cargos item-by-item.
          try {
            const minimal = { ...payload } as Record<string, unknown>;
            delete minimal.cargos;

            await unidadesNaoInternacao.atualizarSitio(
              unidadeId!,
              editandoSitioId,
              minimal
            );

            // Sync cargos item-by-item to ensure associations exist
            for (const item of sitioCargosForm) {
              const qty = Number(item.quantidade_funcionarios || 0);
              try {
                if (item.id) {
                  if (qty > 0) {
                    await unidadesNaoInternacao.atualizarCargoSitio(item.id, {
                      quantidade_funcionarios: qty,
                    });
                  } else {
                    await unidadesNaoInternacao.deletarCargoSitio(item.id);
                  }
                } else if (qty > 0) {
                  // create association for this sitio
                  await unidadesNaoInternacao.criarCargoSitio(editandoSitioId, {
                    cargoId: item.cargoId,
                    quantidade_funcionarios: qty,
                  });
                }
              } catch (syncErr) {
                console.error(
                  "Erro ao sincronizar cargo no fallback:",
                  syncErr
                );
              }
            }

            toast({
              title: "Sucesso",
              description: "Sítio atualizado (fallback)",
            });
            // ensure we reload the fresh data into the UI
            await carregarUnidade();
            // no sitioResult returned in this branch — we'll rely on carregarUnidade
            sitioResult = null;
          } catch (fallbackErr) {
            console.error("Fallback atualizarSitio also failed:", fallbackErr);
            throw fallbackErr;
          }
        }
      } else {
        // Criar (backend retorna o sítio já com cargos embutidos quando cargos enviados)
        sitioResult = await unidadesNaoInternacao.criarSitio(payload);
        toast({
          title: "Sucesso",
          description: `Sítio funcional criado com ${computedVagas} vaga(s)`,
        });
      }

      // determine sitio id (try editandoSitioId, fallback to created result)
      const sitioId =
        editandoSitioId ||
        (sitioResult &&
          (sitioResult.id ||
            sitioResult.data?.id ||
            sitioResult.data?.data?.id));

      // If the backend returned the sitio object (sitioResult), merge it into local state
      if (sitioResult) {
        try {
          const raw = (sitioResult.data ?? sitioResult) as any;
          const sitioObj: SitioFuncionalResponse = {
            ...raw,
            cargos: raw.cargos || raw.cargosSitio || [],
          };

          setUnidade((prev) => {
            if (!prev) return prev;
            const exists = (prev.sitiosFuncionais || []).some(
              (s) => s.id === sitioObj.id
            );
            return {
              ...prev,
              sitiosFuncionais: exists
                ? (prev.sitiosFuncionais || []).map((s) =>
                    s.id === sitioObj.id ? sitioObj : s
                  )
                : [...(prev.sitiosFuncionais || []), sitioObj],
            };
          });
        } catch (mergeErr) {
          console.warn("Erro ao mesclar sítio retornado:", mergeErr);
        }
      }

      // If backend didn't return cargos, we may need to sync item-by-item
      const returnedHasCargos = !!(
        sitioResult &&
        ((sitioResult as any).cargosSitio ||
          (sitioResult as any).cargos ||
          (sitioResult as any).data?.cargosSitio)
      );

      if (!returnedHasCargos && sitioId) {
        // Fallback: sync item-by-item as before
        for (const item of sitioCargosForm) {
          const qty = Number(item.quantidade_funcionarios || 0);
          try {
            if (item.id) {
              if (qty > 0) {
                await unidadesNaoInternacao.atualizarCargoSitio(item.id, {
                  quantidade_funcionarios: qty,
                });
              } else {
                await unidadesNaoInternacao.deletarCargoSitio(item.id);
              }
            } else {
              if (qty > 0) {
                await unidadesNaoInternacao.criarCargoSitio(sitioId, {
                  cargoId: item.cargoId,
                  quantidade_funcionarios: qty,
                });
              }
            }
          } catch (err) {
            console.error("Erro ao sincronizar cargo do sítio:", err);
          }
        }
      }

      // If backend didn't return cargos, try to GET the sitio and merge into unidade
      if (!returnedHasCargos && sitioId) {
        try {
          const fresh = await unidadesNaoInternacao.obterSitio(
            sitioId as string
          );
          // normalize field name
          const sitioObj: SitioFuncionalResponse = {
            ...(fresh as any),
            cargos: (fresh as any).cargos || (fresh as any).cargosSitio || [],
          };

          setUnidade((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              sitiosFuncionais: (prev.sitiosFuncionais || []).map((s) =>
                s.id === sitioObj.id ? sitioObj : s
              ),
            };
          });
        } catch (fetchErr) {
          console.warn("Não foi possível obter sítio após salvar:", fetchErr);
          // fallback to full reload
          await carregarUnidade();
        }
      } else {
        // close and reload normally
        await carregarUnidade();
      }

      fecharModalSitio();
      setEditandoSitioId(null);
    } catch (error) {
      console.error("Erro ao criar/atualizar sítio funcional:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar sítio funcional",
        variant: "destructive",
      });
    }
  };

  // Função para editar sítio (abre modal com dados)
  const editarSitio = (sitioId: string) => {
    const sitio =
      sitiosList?.find((s) => s.id === sitioId) ||
      unidade?.sitiosFuncionais?.find((s) => s.id === sitioId);
    if (!sitio) return;
    setEditandoSitioId(sitio.id);
    // pass the full sitio so abrirModalSitio can read sitio.cargos
    abrirModalSitio(sitio);
  };

  // Função para excluir sítio
  const excluirSitio = async (sitioId: string) => {
    if (!confirm("Tem certeza que deseja excluir este sítio funcional?"))
      return;
    try {
      await unidadesNaoInternacao.deletarSitio(unidadeId!, sitioId);
      await carregarUnidade();
      toast({ title: "Sucesso", description: "Sítio excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir sítio:", error);
      const mensagem =
        error && typeof error === "object" && "message" in error
          ? String((error as Record<string, unknown>).message)
          : "Erro ao excluir sítio funcional";
      toast({
        title: "Erro",
        description: mensagem,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando detalhes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!unidade) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unidade não encontrada
          </h2>
          <p className="text-gray-600 mb-4">
            A unidade solicitada não foi encontrada
          </p>
          <Button onClick={() => navigate(`/hospitais/${hospitalId}`)}>
            Voltar para Hospital
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Contadores de status dos sítios
  const contadorStatus = {
    disponivel: 0,
    emUso: 0,
    inativo: 0,
  };

  sitiosList?.forEach((sitio) => {
    if (sitio.status === "DISPONIVEL") contadorStatus.disponivel++;
    else if (sitio.status === "EM_USO") contadorStatus.emUso++;
    else if (sitio.status === "INATIVO") contadorStatus.inativo++;
    // Se status for undefined, não conta para nenhuma categoria
  });

  const totalSitios = sitiosList?.length || 0;
  const percentualOcupacao =
    totalSitios > 0 ? (contadorStatus.emUso / totalSitios) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/hospitais/${hospitalId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {unidade.nome}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">Unidade de Não-Internação</Badge>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm text-gray-600">
                    {unidade.hospital.nome}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações da Unidade */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Nome</Label>
                <p className="text-sm text-muted-foreground">{unidade.nome}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Total de Sítios Funcionais
                </Label>
                <p className="text-sm text-muted-foreground">{totalSitios}</p>
              </div>
              {unidade.cargosUnidade && unidade.cargosUnidade.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">
                    Total de Funcionários
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {unidade.cargosUnidade.reduce(
                      (sum, c) => sum + (c.quantidade_funcionarios || 0),
                      0
                    )}
                  </p>
                </div>
              )}
              {unidade.descricao && (
                <div className="md:col-span-3">
                  <Label className="text-sm font-medium">Descrição</Label>
                  <p className="text-sm text-muted-foreground">
                    {unidade.descricao}
                  </p>
                </div>
              )}
            </div>

            {/* Horas Extras e Cargos (similar style to UnidadeDetails) */}
            {(unidade.horas_extra_reais ||
              unidade.horas_extra_projetadas ||
              (unidade.cargosUnidade && unidade.cargosUnidade.length > 0)) && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Horas Extras */}
                  {unidade.horas_extra_reais ||
                  unidade.horas_extra_projetadas ? (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Horas Extras
                      </Label>
                      <div className="space-y-2">
                        {unidade.horas_extra_reais && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Valor (R$):
                            </span>
                            <span className="font-medium">
                              R$ {String(unidade.horas_extra_reais)}
                            </span>
                          </div>
                        )}
                        {unidade.horas_extra_projetadas && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Projetadas:
                            </span>
                            <span className="font-medium">
                              {String(unidade.horas_extra_projetadas)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Funcionários por Cargo */}
                  {unidade.cargosUnidade &&
                    unidade.cargosUnidade.length > 0 && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium mb-2 block">
                          Funcionários por Cargo
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {unidade.cargosUnidade.map((cargoUnidade, index) => {
                            const cargoKeyFromCargo = getCargoId(
                              cargoUnidade.cargo
                            );
                            const cargoUnidadeId = (cargoUnidade as any).id;
                            const cargoLegacyId = (cargoUnidade as any).cargoId;
                            const cargoId =
                              cargoKeyFromCargo ||
                              cargoUnidadeId ||
                              cargoLegacyId ||
                              `cargo-${index}`;
                            const alocados =
                              alocadosPorCargo[cargoId] ||
                              (cargoUnidadeId &&
                                alocadosPorCargo[cargoUnidadeId]) ||
                              (cargoLegacyId &&
                                alocadosPorCargo[cargoLegacyId]) ||
                              0;

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {cargoUnidade.cargo?.nome ||
                                      "Cargo não encontrado"}
                                  </p>
                                  {/** show salary if available in nested cargo object */}
                                  {(
                                    cargoUnidade.cargo as unknown as {
                                      salario?: string | number;
                                    }
                                  ).salario && (
                                    <p className="text-xs text-muted-foreground">
                                      Salário: R${" "}
                                      {String(
                                        (
                                          cargoUnidade.cargo as unknown as {
                                            salario?: string | number;
                                          }
                                        ).salario
                                      )}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">
                                    {cargoUnidade.quantidade_funcionarios}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    funcionários • Alocados: {alocados}
                                    {" • "}
                                    Disponível:{" "}
                                    {cargoUnidade.quantidade_funcionarios -
                                      alocados}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs para navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dimensionamento">
              <FileText className="h-4 w-4 mr-2" />
              Dimensionamento
            </TabsTrigger>
            <TabsTrigger value="sitios">
              <MapPin className="h-4 w-4 mr-2" />
              Sítios Funcionais
            </TabsTrigger>
          </TabsList>

          {/* Tab Estatísticas */}
          <TabsContent value="estatisticas" className="space-y-4">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Distribuição de Status dos Sítios Funcionais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold ">
                      {contadorStatus.disponivel}
                    </div>
                    <div className="text-sm ">Disponível</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold ">
                      {contadorStatus.emUso}
                    </div>
                    <div className="text-sm ">Em Uso</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {contadorStatus.inativo}
                    </div>
                    <div className="text-sm text-gray-600">Inativo</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Dimensionamento */}
          <TabsContent value="dimensionamento" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Fechamento Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumo Mensal */}

                {/* Fechamento por Sítio Funcional */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Fechamento por Sítio Funcional
                  </h3>

                  {/* If cargos exist, show financial/personnel table similar to UnidadeDetails but simplified */}
                  {unidade.cargosUnidade && unidade.cargosUnidade.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Análise Financeira e de Pessoal
                      </h3>
                      <div className="overflow-x-auto">
                        <Table className="rounded-lg">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Função</TableHead>
                              <TableHead>Salário Médio (R$)</TableHead>
                              <TableHead>Adicionais/Tributos (R$)</TableHead>
                              <TableHead>
                                Custo Total por Funcionário (R$)
                              </TableHead>
                              <TableHead>Atual (Nº de Profissionais)</TableHead>
                              <TableHead>Custo Total Atual (R$)</TableHead>
                              <TableHead>
                                Calculado (Qtd. Profissionais)
                              </TableHead>
                              <TableHead>Custo Total Calculado (R$)</TableHead>
                              <TableHead>Variação (R$)</TableHead>
                              <TableHead>Variação (%)</TableHead>
                              <TableHead>Variação de Profissionais</TableHead>
                              <TableHead>Horas Reais (Atual)</TableHead>
                              <TableHead>Horas Calculadas</TableHead>
                              <TableHead>Variação Horas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Group analysis by sitio. For each sitio render a header row,
                                 then render cargo rows using the sitio's cargo quantities
                                 while looking up salary/adicional/carga from unidade.cargosUnidade. */}
                            {(
                              (sitiosList && sitiosList.length > 0
                                ? sitiosList
                                : unidade?.sitiosFuncionais || []) as any[]
                            ).map((sitio, sitioIndex) => {
                              // accumulate subtotal for this sitio
                              const sitioSubtotal = {
                                quantidadeAtual: 0,
                                custoTotalAtual: 0,
                                quantidadeCalculada: 0,
                                custoTotalCalculado: 0,
                                variacaoCusto: 0,
                                variacaoQuantidade: 0,
                                horasReais: 0,
                                horasCalculadas: 0,
                              } as Record<string, number>;

                              const cargoRows = (sitio.cargos || []).map(
                                (sc: any, idx: number) => {
                                  // Derive canonical cargoId from sitio cargo shape
                                  const cargoId =
                                    sc.cargoId ||
                                    sc.cargoUnidadeId ||
                                    sc.id ||
                                    (sc.cargo && sc.cargo.id) ||
                                    String(idx);

                                  // Find unit-level cargo data to source salary/adicionais/carga
                                  const cu = (
                                    unidade?.cargosUnidade || []
                                  ).find(
                                    (u) =>
                                      (u.cargo &&
                                        (u.cargo as any).id &&
                                        String((u.cargo as any).id) ===
                                          String(cargoId)) ||
                                      (u as any).id === cargoId ||
                                      (u as any).cargoId === cargoId
                                  );

                                  // parse salary/adicionais/carga following same rules as calcularAnaliseFinanceiraNaoInternacao
                                  const salario = cu
                                    ? parseFloat(
                                        String(
                                          (cu.cargo as any)?.salario ?? "0"
                                        ).replace(",", ".")
                                      ) || 0
                                    : 0;
                                  const adicionais = cu
                                    ? parseFloat(
                                        String(
                                          (cu.cargo as any)
                                            ?.adicionais_tributos ?? "0"
                                        ).replace(",", ".")
                                      ) || 0
                                    : 0;
                                  const custoTotalPorFuncionario =
                                    salario + adicionais;

                                  const quantidadeAtual = Number(
                                    sc.quantidade_funcionarios || 0
                                  );

                                  // quantidadeCalculada still uses global editable map when present, otherwise fall back to site quantity
                                  const quantidadeCalculada =
                                    (quantidadesEditaveis[cargoId] ??
                                      quantidadeAtual) as number;

                                  const cargaHoraria = cu
                                    ? parseFloat(
                                        String(
                                          (cu.cargo as any)?.carga_horaria ??
                                            "40"
                                        ).replace("h", "")
                                      ) || 40
                                    : 40;

                                  const custoTotalAtual =
                                    quantidadeAtual * custoTotalPorFuncionario;
                                  const custoTotalCalculado =
                                    quantidadeCalculada *
                                    custoTotalPorFuncionario;
                                  const variacaoCusto =
                                    custoTotalCalculado - custoTotalAtual;
                                  const variacaoQuantidade =
                                    quantidadeCalculada - quantidadeAtual;
                                  const horasReais =
                                    quantidadeAtual * cargaHoraria;
                                  const horasCalculadas =
                                    quantidadeCalculada * cargaHoraria;

                                  // accumulate into sitio subtotal
                                  sitioSubtotal.quantidadeAtual +=
                                    quantidadeAtual;
                                  sitioSubtotal.custoTotalAtual +=
                                    custoTotalAtual;
                                  sitioSubtotal.quantidadeCalculada +=
                                    quantidadeCalculada;
                                  sitioSubtotal.custoTotalCalculado +=
                                    custoTotalCalculado;
                                  sitioSubtotal.variacaoCusto += variacaoCusto;
                                  sitioSubtotal.variacaoQuantidade +=
                                    variacaoQuantidade;
                                  sitioSubtotal.horasReais +=
                                    Number(horasReais) || 0;
                                  sitioSubtotal.horasCalculadas +=
                                    Number(horasCalculadas) || 0;

                                  return (
                                    <TableRow
                                      key={`${sitio.id}-${cargoId}`}
                                      className="border-b border-border/50"
                                    >
                                      <TableCell className="font-medium">
                                        {cu?.cargo?.nome ||
                                          sc.cargo?.nome ||
                                          sc.nome ||
                                          cargoId}
                                      </TableCell>
                                      <TableCell>
                                        R${" "}
                                        {salario.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </TableCell>
                                      <TableCell>
                                        R${" "}
                                        {adicionais.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </TableCell>
                                      <TableCell>
                                        R${" "}
                                        {custoTotalPorFuncionario.toLocaleString(
                                          "pt-BR",
                                          {
                                            minimumFractionDigits: 2,
                                          }
                                        )}
                                      </TableCell>
                                      <TableCell>{quantidadeAtual}</TableCell>
                                      <TableCell>
                                        R${" "}
                                        {custoTotalAtual.toLocaleString(
                                          "pt-BR",
                                          {
                                            minimumFractionDigits: 2,
                                          }
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={quantidadeCalculada}
                                          onChange={(e) =>
                                            atualizarQuantidadeEditavel(
                                              cargoId,
                                              parseInt(e.target.value || "0")
                                            )
                                          }
                                          className="w-20 mx-auto text-center text-sm"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        R${" "}
                                        {custoTotalCalculado.toLocaleString(
                                          "pt-BR",
                                          {
                                            minimumFractionDigits: 2,
                                          }
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        R${" "}
                                        {variacaoCusto.toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                          signDisplay: "always",
                                        })}
                                      </TableCell>
                                      <TableCell>
                                        {quantidadeCalculada > 0 &&
                                        quantidadeAtual > 0
                                          ? Math.round(
                                              ((quantidadeCalculada -
                                                quantidadeAtual) /
                                                (quantidadeAtual || 1)) *
                                                100
                                            )
                                          : 0}
                                        %
                                      </TableCell>
                                      <TableCell>
                                        {variacaoQuantidade}
                                      </TableCell>
                                      <TableCell>
                                        {Number(horasReais) || 0}h
                                      </TableCell>
                                      <TableCell>
                                        {Number(horasCalculadas) || 0}h
                                      </TableCell>
                                      <TableCell>
                                        {(
                                          (Number(horasCalculadas) || 0) -
                                          (Number(horasReais) || 0)
                                        ).toFixed(1)}
                                        h
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                              );

                              return (
                                <React.Fragment
                                  key={`sitio-${sitio.id || sitioIndex}`}
                                >
                                  <TableRow className="bg-slate-50 hover:bg-slate-100">
                                    <TableCell colSpan={14}>
                                      <div className="flex items-center justify-between">
                                        <div className="font-semibold text-slate-800">
                                          {sitio.nome ||
                                            `Sítio ${sitioIndex + 1}`}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {cargoRows}
                                  {/* Subtotal row for this sitio */}
                                  <TableRow className="bg-slate-100">
                                    <TableCell className="font-semibold text-slate-800">
                                      SUBTOTAL (
                                      {sitio.nome || `Sítio ${sitioIndex + 1}`})
                                    </TableCell>
                                    <TableCell>—</TableCell>
                                    <TableCell>—</TableCell>
                                    <TableCell>—</TableCell>
                                    <TableCell>
                                      {sitioSubtotal.quantidadeAtual}
                                    </TableCell>
                                    <TableCell>
                                      R${" "}
                                      {sitioSubtotal.custoTotalAtual.toLocaleString(
                                        "pt-BR",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {sitioSubtotal.quantidadeCalculada}
                                    </TableCell>
                                    <TableCell>
                                      R${" "}
                                      {sitioSubtotal.custoTotalCalculado.toLocaleString(
                                        "pt-BR",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      R${" "}
                                      {sitioSubtotal.variacaoCusto.toLocaleString(
                                        "pt-BR",
                                        { minimumFractionDigits: 2 }
                                      )}
                                    </TableCell>
                                    <TableCell>—</TableCell>
                                    <TableCell>
                                      {sitioSubtotal.variacaoQuantidade}
                                    </TableCell>
                                    <TableCell>
                                      {sitioSubtotal.horasReais}h
                                    </TableCell>
                                    <TableCell>
                                      {sitioSubtotal.horasCalculadas}h
                                    </TableCell>
                                    <TableCell>
                                      {(
                                        sitioSubtotal.horasCalculadas -
                                        sitioSubtotal.horasReais
                                      ).toFixed(1)}
                                      h
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              );
                            })}

                            {/* Totals row (aggregate across sitios) */}
                            {
                              // compute global totals by aggregating per-site cargos
                            }
                            <TableRow className="bg-slate-400">
                              <TableCell>TOTAL GERAL</TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>
                                {(
                                  ((sitiosList && sitiosList.length > 0
                                    ? sitiosList
                                    : unidade?.sitiosFuncionais) || []) as any[]
                                ).reduce((sum, s) => {
                                  return (
                                    sum +
                                    (s.cargos || []).reduce(
                                      (ss: number, c: any) =>
                                        ss +
                                        Number(c.quantidade_funcionarios || 0),
                                      0
                                    )
                                  );
                                }, 0)}
                              </TableCell>
                              <TableCell>
                                R${" "}
                                {(
                                  ((sitiosList && sitiosList.length > 0
                                    ? sitiosList
                                    : unidade?.sitiosFuncionais) || []) as any[]
                                )
                                  .reduce((sum, s) => {
                                    return (
                                      sum +
                                      (s.cargos || []).reduce(
                                        (ss: number, c: any) => {
                                          // lookup unit-level cargo for price
                                          const cargoId =
                                            c.cargoId ||
                                            c.cargoUnidadeId ||
                                            c.id ||
                                            (c.cargo && c.cargo.id);
                                          const cu = (
                                            unidade?.cargosUnidade || []
                                          ).find(
                                            (u) =>
                                              (u.cargo &&
                                                (u.cargo as any).id &&
                                                String((u.cargo as any).id) ===
                                                  String(cargoId)) ||
                                              (u as any).id === cargoId ||
                                              (u as any).cargoId === cargoId
                                          );
                                          const salario = cu
                                            ? parseFloat(
                                                String(
                                                  (cu.cargo as any)?.salario ??
                                                    "0"
                                                ).replace(",", ".")
                                              ) || 0
                                            : 0;
                                          const adicionais = cu
                                            ? parseFloat(
                                                String(
                                                  (cu.cargo as any)
                                                    ?.adicionais_tributos ?? "0"
                                                ).replace(",", ".")
                                              ) || 0
                                            : 0;
                                          const custoTotalPorFuncionario =
                                            salario + adicionais;
                                          return (
                                            ss +
                                            Number(
                                              c.quantidade_funcionarios || 0
                                            ) *
                                              custoTotalPorFuncionario
                                          );
                                        },
                                        0
                                      )
                                    );
                                  }, 0)
                                  .toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                              </TableCell>
                              <TableCell>
                                {(
                                  ((sitiosList && sitiosList.length > 0
                                    ? sitiosList
                                    : unidade?.sitiosFuncionais) || []) as any[]
                                ).reduce((sum, s) => {
                                  return (
                                    sum +
                                    (s.cargos || []).reduce(
                                      (ss: number, c: any) => {
                                        const cargoId =
                                          c.cargoId ||
                                          c.cargoUnidadeId ||
                                          c.id ||
                                          (c.cargo && c.cargo.id);
                                        const quantidadeCalculada =
                                          quantidadesEditaveis[cargoId] ??
                                          Number(
                                            c.quantidade_funcionarios || 0
                                          );
                                        return ss + quantidadeCalculada;
                                      },
                                      0
                                    )
                                  );
                                }, 0)}
                              </TableCell>
                              <TableCell>
                                R${" "}
                                {(
                                  ((sitiosList && sitiosList.length > 0
                                    ? sitiosList
                                    : unidade?.sitiosFuncionais) || []) as any[]
                                )
                                  .reduce((sum, s) => {
                                    return (
                                      sum +
                                      (s.cargos || []).reduce(
                                        (ss: number, c: any) => {
                                          const cargoId =
                                            c.cargoId ||
                                            c.cargoUnidadeId ||
                                            c.id ||
                                            (c.cargo && c.cargo.id);
                                          const cu = (
                                            unidade?.cargosUnidade || []
                                          ).find(
                                            (u) =>
                                              (u.cargo &&
                                                (u.cargo as any).id &&
                                                String((u.cargo as any).id) ===
                                                  String(cargoId)) ||
                                              (u as any).id === cargoId ||
                                              (u as any).cargoId === cargoId
                                          );
                                          const salario = cu
                                            ? parseFloat(
                                                String(
                                                  (cu.cargo as any)?.salario ??
                                                    "0"
                                                ).replace(",", ".")
                                              ) || 0
                                            : 0;
                                          const adicionais = cu
                                            ? parseFloat(
                                                String(
                                                  (cu.cargo as any)
                                                    ?.adicionais_tributos ?? "0"
                                                ).replace(",", ".")
                                              ) || 0
                                            : 0;
                                          const custoTotalPorFuncionario =
                                            salario + adicionais;
                                          const quantidadeCalculada =
                                            quantidadesEditaveis[cargoId] ??
                                            Number(
                                              c.quantidade_funcionarios || 0
                                            );
                                          return (
                                            ss +
                                            quantidadeCalculada *
                                              custoTotalPorFuncionario
                                          );
                                        },
                                        0
                                      )
                                    );
                                  }, 0)
                                  .toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                              </TableCell>
                              <TableCell>
                                R${" "}
                                {(
                                  ((sitiosList && sitiosList.length > 0
                                    ? sitiosList
                                    : unidade?.sitiosFuncionais) || []) as any[]
                                )
                                  .reduce((sum, s) => {
                                    return (
                                      sum +
                                      (s.cargos || []).reduce(
                                        (ss: number, c: any) => {
                                          const cargoId =
                                            c.cargoId ||
                                            c.cargoUnidadeId ||
                                            c.id ||
                                            (c.cargo && c.cargo.id);
                                          const cu = (
                                            unidade?.cargosUnidade || []
                                          ).find(
                                            (u) =>
                                              (u.cargo &&
                                                (u.cargo as any).id &&
                                                String((u.cargo as any).id) ===
                                                  String(cargoId)) ||
                                              (u as any).id === cargoId ||
                                              (u as any).cargoId === cargoId
                                          );
                                          const salario = cu
                                            ? parseFloat(
                                                String(
                                                  (cu.cargo as any)?.salario ??
                                                    "0"
                                                ).replace(",", ".")
                                              ) || 0
                                            : 0;
                                          const adicionais = cu
                                            ? parseFloat(
                                                String(
                                                  (cu.cargo as any)
                                                    ?.adicionais_tributos ?? "0"
                                                ).replace(",", ".")
                                              ) || 0
                                            : 0;
                                          const custoTotalPorFuncionario =
                                            salario + adicionais;
                                          const quantidadeCalculada =
                                            quantidadesEditaveis[cargoId] ??
                                            Number(
                                              c.quantidade_funcionarios || 0
                                            );
                                          const custoTotalAtual =
                                            Number(
                                              c.quantidade_funcionarios || 0
                                            ) * custoTotalPorFuncionario;
                                          const custoTotalCalculado =
                                            quantidadeCalculada *
                                            custoTotalPorFuncionario;
                                          return (
                                            ss +
                                            (custoTotalCalculado -
                                              custoTotalAtual)
                                          );
                                        },
                                        0
                                      )
                                    );
                                  }, 0)
                                  .toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                              </TableCell>
                              <TableCell>—</TableCell>
                              <TableCell>
                                {(
                                  ((sitiosList && sitiosList.length > 0
                                    ? sitiosList
                                    : unidade?.sitiosFuncionais) || []) as any[]
                                ).reduce((sum, s) => {
                                  return (
                                    sum +
                                    (s.cargos || []).reduce(
                                      (ss: number, c: any) => {
                                        const cargoId =
                                          c.cargoId ||
                                          c.cargoUnidadeId ||
                                          c.id ||
                                          (c.cargo && c.cargo.id);
                                        const quantidadeCalculada =
                                          quantidadesEditaveis[cargoId] ??
                                          Number(
                                            c.quantidade_funcionarios || 0
                                          );
                                        const quantidadeAtual = Number(
                                          c.quantidade_funcionarios || 0
                                        );
                                        return (
                                          ss +
                                          (quantidadeCalculada -
                                            quantidadeAtual)
                                        );
                                      },
                                      0
                                    )
                                  );
                                }, 0)}
                              </TableCell>
                              <TableCell>
                                {calcularAnaliseFinanceiraNaoInternacao().reduce(
                                  (s, r) => s + r.horasReais,
                                  0
                                )}
                                h
                              </TableCell>
                              <TableCell>
                                {calcularAnaliseFinanceiraNaoInternacao().reduce(
                                  (s, r) => s + r.horasCalculadas,
                                  0
                                )}
                                h
                              </TableCell>
                              <TableCell>
                                {calcularAnaliseFinanceiraNaoInternacao()
                                  .reduce((s, r) => s + r.variacaoHoras, 0)
                                  .toFixed(1)}
                                h
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Nenhum cargo cadastrado para análise.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Sítios */}
          <TabsContent value="sitios" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Gestão de Sítios Funcionais
              </h2>
              <Button
                onClick={() => abrirModalSitio()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Sítio Funcional
              </Button>
            </div>

            {sitiosList && sitiosList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sitiosList.map((sitio) => {
                  return (
                    <Card
                      key={sitio.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary"
                      onClick={() => editarSitio(sitio.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <MapPin className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold">
                                {sitio.nome}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {sitio.numero}
                              </p>
                              {sitio.descricao && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {sitio.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Estatísticas das Posições */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold ">
                              {sitio.cargos?.length || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Cargos
                            </div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold ">
                              {(sitio.cargos || []).reduce(
                                (acc, c) =>
                                  acc + (c.quantidade_funcionarios || 0),
                                0
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Funcionários alocados
                            </div>
                          </div>
                        </div>

                        {/* Informações Adicionais */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total de Cargos:
                            </span>
                            <span className="font-medium">
                              {sitio.cargos?.length || 0}
                            </span>
                          </div>
                        </div>

                        {/* Call to Action */}
                        <div className="pt-2">
                          <div className="flex items-center justify-center text-xs text-muted-foreground">
                            <span>Clique para gerenciar posições</span>
                            <ArrowLeft className="h-3 w-3 ml-1 rotate-180" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum sítio funcional cadastrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece adicionando sítios funcionais para esta unidade.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal para criar Sítio Funcional */}
        <Dialog open={sitioModalOpen} onOpenChange={setSitioModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editandoSitioId
                  ? "Editar Sítio Funcional"
                  : "Novo Sítio Funcional"}
              </DialogTitle>
              <DialogDescription>
                {editandoSitioId
                  ? "Edite os dados do sítio funcional e as vagas por cargo desta unidade."
                  : "Adicione um novo sítio funcional para esta unidade."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={criarSitioFuncional} className="space-y-4">
              <div>
                <Label htmlFor="sitio-nome">Nome do Sítio Funcional *</Label>
                <Input
                  id="sitio-nome"
                  value={sitioFormData.nome}
                  onChange={(e) =>
                    setSitioFormData({ ...sitioFormData, nome: e.target.value })
                  }
                  placeholder="Ex: Sala de Cirurgia 01, Consultório A"
                  required
                />
              </div>

              {/* Número de vagas agora é calculado automaticamente pela soma das quantidades
                  informadas nos cargos abaixo. Mostramos o total como read-only. */}
              <div>
                <Label>Número de Vagas (calculado)</Label>
                <Input
                  value={sitioCargosForm.reduce(
                    (s, c) => s + Number(c.quantidade_funcionarios || 0),
                    0
                  )}
                  readOnly
                />
                <p className="text-xs text-gray-600 mt-1">
                  O total de vagas é definido pela soma das quantidades de
                  funcionários inseridas nos cargos desta unidade.
                </p>
              </div>

              {/* Cargos disponíveis na unidade - permitir ajustar quantidade por cargo para este sítio */}
              {(unidade?.cargosUnidade || []).length > 0 && (
                <div>
                  <Label>Cargos (alocação para este sítio)</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
                    {(unidade?.cargosUnidade || []).map(
                      (cu: CargoUnidadeResponse, idx: number) => {
                        const cargoId =
                          cu.cargo?.id || (cu as any).cargoId || (cu as any).id;
                        const label =
                          cu.cargo?.nome || (cu as any).nome || "Cargo";
                        const formItem = sitioCargosForm.find(
                          (s) => s.cargoId === cargoId
                        );
                        const value = formItem
                          ? formItem.quantidade_funcionarios
                          : 0;

                        // Compute availability as: unidade total for this cargo minus
                        // allocations already made in other sitios (exclude the site
                        // currently being edited). Use robust id matching to handle
                        // backend shape variations.
                        const unitTotal = Number(
                          cu.quantidade_funcionarios || 0
                        );
                        const cargoKeyIds = new Set<string>();
                        if (cu.cargo && (cu.cargo as any).id)
                          cargoKeyIds.add(String((cu.cargo as any).id));
                        if ((cu as any).id)
                          cargoKeyIds.add(String((cu as any).id));
                        if ((cu as any).cargoId)
                          cargoKeyIds.add(String((cu as any).cargoId));

                        let aggregatedAllocated = 0;
                        const source =
                          sitiosList && sitiosList.length > 0
                            ? sitiosList
                            : unidade?.sitiosFuncionais || [];
                        for (const s of source) {
                          if (editandoSitioId && s.id === editandoSitioId)
                            continue;
                          for (const c of s.cargos || []) {
                            const sitioIds = new Set<string>();
                            if ((c as any).cargoUnidadeId)
                              sitioIds.add(String((c as any).cargoUnidadeId));
                            if ((c as any).cargoId)
                              sitioIds.add(String((c as any).cargoId));
                            if ((c as any).id)
                              sitioIds.add(String((c as any).id));
                            if ((c as any).cargo && (c as any).cargo.id)
                              sitioIds.add(String((c as any).cargo.id));
                            if (
                              (c as any).cargoUnidade &&
                              (c as any).cargoUnidade.id
                            )
                              sitioIds.add(String((c as any).cargoUnidade.id));
                            if (
                              (c as any).cargoUnidade &&
                              (c as any).cargoUnidade.cargo &&
                              (c as any).cargoUnidade.cargo.id
                            )
                              sitioIds.add(
                                String((c as any).cargoUnidade.cargo.id)
                              );

                            const intersects = [...cargoKeyIds].some((id) =>
                              sitioIds.has(id)
                            );
                            if (intersects) {
                              aggregatedAllocated +=
                                Number(c.quantidade_funcionarios || 0) || 0;
                            }
                          }
                        }

                        const available = Math.max(
                          0,
                          Math.floor(unitTotal - aggregatedAllocated)
                        );

                        // Prefer the simple UI-facing `disponiveis` state (total - alocados)
                        // falling back to the robust disponibilidadePorCargo map or the
                        // locally computed `available` value.
                        const uiAvailable =
                          disponiveis[cargoId] ??
                          disponibilidadePorCargo[cargoId] ??
                          available;

                        return (
                          <div
                            key={cargoId}
                            className="flex items-center space-x-2 p-2 border rounded"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium">{label}</div>
                              <div className="text-xs text-muted-foreground">
                                Disponível: {uiAvailable}
                              </div>
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) => {
                                  const q = parseInt(e.target.value) || 0;
                                  setSitioCargosForm((prev) => {
                                    const found = prev.find(
                                      (p) => p.cargoId === cargoId
                                    );
                                    if (found) {
                                      return prev.map((p) =>
                                        p.cargoId === cargoId
                                          ? { ...p, quantidade_funcionarios: q }
                                          : p
                                      );
                                    }
                                    return [
                                      ...prev,
                                      { cargoId, quantidade_funcionarios: q },
                                    ];
                                  });
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="sitio-descricao">Descrição</Label>
                <Textarea
                  id="sitio-descricao"
                  value={sitioFormData.descricao}
                  onChange={(e) =>
                    setSitioFormData({
                      ...sitioFormData,
                      descricao: e.target.value,
                    })
                  }
                  placeholder="Descrição opcional do sítio funcional"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fecharModalSitio}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editandoSitioId
                    ? "Atualizar Sítio"
                    : "Criar Sítio Funcional"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal para Justificativa de Status Inativo */}
        <Dialog
          open={justificativaModalOpen}
          onOpenChange={setJustificativaModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Justificativa para Status Inativo</DialogTitle>
              <DialogDescription>
                Informe o motivo pelo qual esta posição está sendo marcada como
                inativa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Textarea
                  id="justificativa"
                  value={justificativaFormData.justificativa}
                  onChange={(e) =>
                    setJustificativaFormData({
                      justificativa: e.target.value,
                    })
                  }
                  placeholder="Ex: Equipamento em manutenção, reforma do local, falta de pessoal..."
                  rows={4}
                  required
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
