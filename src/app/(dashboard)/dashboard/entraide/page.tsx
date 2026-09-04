'use client';

/* eslint-disable max-lines, react/no-unescaped-entities, react-hooks/exhaustive-deps */

// Page /dashboard/entraide — Cercle de traders (mise en relation, missions collectives, contact sécurisé)
// Adaptation domaine trading : binômes/groupes analyse marché, partage stratégies, pairs (CLAUDE.md Loi 12)

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users2,
  Target,
  MessageCircle,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Send,
  Shield,
} from 'lucide-react';

interface Match {
  userId: string;
  fullName: string;
  score: number;
  reasons: string[];
  skillsOffered: string[];
  availabilityDays: string[];
}

interface Mission {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  min_participants: number;
  max_participants: number | null;
  status: string;
  created_at: string;
  missions_collectives_participants: Array<{ user_id: string }>;
}

interface ContactRequest {
  id: string;
  requester_id?: string;
  recipient_id?: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface ProfileData {
  skillsOffered: string[];
  skillsNeeded: string[];
  availabilityDays: string[];
  radiusKm: number;
  locationLat: number | null;
  locationLng: number | null;
}

export default function EntraidePage() {
  const [activeTab, setActiveTab] = useState<'monProfil' | 'matches' | 'missions' | 'contacts'>('missions');
  const [matches, setMatches] = useState<Match[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [contactsReceived, setContactsReceived] = useState<ContactRequest[]>([]);
  const [contactsSent, setContactsSent] = useState<ContactRequest[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger données au mount
  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'monProfil') {
        setProfileLoading(true);
        const res = await fetch('/api/entraide/profil');
        if (res.ok) {
          const data = await res.json();
          setProfile(
            data.profile || {
              skillsOffered: [],
              skillsNeeded: [],
              availabilityDays: [],
              radiusKm: 50,
              locationLat: null,
              locationLng: null,
            }
          );
        }
        setProfileLoading(false);
      } else if (activeTab === 'matches') {
        const res = await fetch('/api/entraide/matches');
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches || []);
        }
      } else if (activeTab === 'missions') {
        const res = await fetch('/api/entraide/missions');
        if (res.ok) {
          const data = await res.json();
          setMissions(data.missions || []);
        }
      } else if (activeTab === 'contacts') {
        const res = await fetch('/api/entraide/contacts');
        if (res.ok) {
          const data = await res.json();
          setContactsReceived(data.received || []);
          setContactsSent(data.sent || []);
        }
      }
    } catch (error) {
      console.error('Erreur chargement', error);
    } finally {
      setLoading(false);
    }
  }

  async function createMission(title: string, description: string) {
    try {
      const res = await fetch('/api/entraide/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          minParticipants: 2,
          maxParticipants: 5,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur création mission');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur réseau');
    }
  }

  async function joinMission(missionId: string) {
    try {
      const res = await fetch(`/api/entraide/missions/${missionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur rejoindre mission');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function sendContactRequest(recipientId: string) {
    try {
      const res = await fetch('/api/entraide/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, message: 'Échangeons sur nos stratégies trading !' }),
      });
      if (res.ok) {
        alert('Demande envoyée');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur envoi demande');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function respondContact(requestId: string, response: 'accept' | 'decline' | 'block') {
    try {
      const res = await fetch(`/api/entraide/contacts/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.channelId) {
          alert(`Contact accepté ! Conversation: ${data.channelId}`);
        }
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur réponse');
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function saveProfile(data: ProfileData) {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/entraide/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setProfileMessage({ type: 'success', text: 'Profil sauvegardé' });
        setProfile(data);
      } else {
        const err = await res.json();
        setProfileMessage({ type: 'error', text: err.error || 'Erreur sauvegarde' });
      }
    } catch (error) {
      console.error(error);
      setProfileMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setProfileSaving(false);
    }
  }

  const tabs = [
    { id: 'missions' as const, label: 'Missions Collectives', icon: Target },
    { id: 'monProfil' as const, label: 'Mon Profil', icon: UserPlus },
    { id: 'matches' as const, label: 'Traders Compatibles', icon: Users2 },
    { id: 'contacts' as const, label: 'Demandes Contact', icon: MessageCircle },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
          Cercle de Traders
        </h1>
        <p className="text-[var(--fg-muted)] mt-2">
          Échangez, collaborez, partagez vos stratégies avec des pairs compatibles
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <div>
          {/* MON PROFIL */}
          {activeTab === 'monProfil' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Mon profil d'entraide</h2>
              </div>

              {profileLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)] border-t-transparent" />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-6 border border-[var(--border-subtle)]"
                >
                  {profileMessage && (
                    <div
                      className={`mb-4 p-4 rounded-xl text-sm ${
                        profileMessage.type === 'success'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {profileMessage.text}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (profile) saveProfile(profile);
                    }}
                    className="space-y-6"
                  >
                    {/* Compétences offertes */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Compétences offertes (stratégies, analyses que tu maîtrises)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: scalping, swing trading, analyse technique"
                        value={profile?.skillsOffered.join(', ') || ''}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...(prev || {
                              skillsOffered: [],
                              skillsNeeded: [],
                              availabilityDays: [],
                              radiusKm: 50,
                              locationLat: null,
                              locationLng: null,
                            }),
                            skillsOffered: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter((s) => s.length > 0),
                          }))
                        }
                        className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition"
                      />
                      <p className="text-xs text-[var(--fg-muted)] mt-1">Séparez par des virgules</p>
                    </div>

                    {/* Compétences recherchées */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Compétences recherchées (ce que tu veux apprendre)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: options, crypto, day trading"
                        value={profile?.skillsNeeded.join(', ') || ''}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...(prev || {
                              skillsOffered: [],
                              skillsNeeded: [],
                              availabilityDays: [],
                              radiusKm: 50,
                              locationLat: null,
                              locationLng: null,
                            }),
                            skillsNeeded: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter((s) => s.length > 0),
                          }))
                        }
                        className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)] transition"
                      />
                      <p className="text-xs text-[var(--fg-muted)] mt-1">Séparez par des virgules</p>
                    </div>

                    {/* Disponibilités */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Disponibilités (jours)</label>
                      <div className="flex flex-wrap gap-2">
                        {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(
                          (day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const current = profile?.availabilityDays || [];
                                const newDays = current.includes(day)
                                  ? current.filter((d) => d !== day)
                                  : [...current, day];
                                setProfile((prev) => ({
                                  ...(prev || {
                                    skillsOffered: [],
                                    skillsNeeded: [],
                                    availabilityDays: [],
                                    radiusKm: 50,
                                    locationLat: null,
                                    locationLng: null,
                                  }),
                                  availabilityDays: newDays,
                                }));
                              }}
                              className={`px-4 py-2 rounded-lg text-sm transition ${
                                profile?.availabilityDays.includes(day)
                                  ? 'bg-[var(--primary)] text-white'
                                  : 'bg-[var(--bg-base)] text-[var(--fg-muted)] border border-[var(--border-subtle)] hover:border-[var(--primary)]'
                              }`}
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Rayon */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Rayon de recherche (km) : {profile?.radiusKm || 50}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="500"
                        step="5"
                        value={profile?.radiusKm || 50}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...(prev || {
                              skillsOffered: [],
                              skillsNeeded: [],
                              availabilityDays: [],
                              radiusKm: 50,
                              locationLat: null,
                              locationLng: null,
                            }),
                            radiusKm: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-[var(--fg-muted)] mt-1">
                        Définit la distance maximale pour trouver des traders compatibles
                      </p>
                    </div>

                    {/* Bouton */}
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="w-full px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                    >
                      {profileSaving ? 'Sauvegarde...' : 'Sauvegarder mon profil'}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          )}

          {/* MISSIONS */}
          {activeTab === 'missions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Missions actives</h2>
                <button
                  onClick={() => {
                    const title = prompt('Titre de la mission (ex: Analyse BTC/USD)');
                    const description = prompt('Description');
                    if (title && description) createMission(title, description);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer Mission</span>
                </button>
              </div>

              {missions.length === 0 ? (
                <div className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-8 text-center border border-[var(--border-subtle)]">
                  <Target className="w-12 h-12 mx-auto mb-4 text-[var(--fg-muted)]" />
                  <p className="text-[var(--fg-muted)]">
                    Aucune mission collective en cours. Créez la première !
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {missions.map((mission) => (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-6 border border-[var(--border-subtle)]"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{mission.title}</h3>
                          <p className="text-sm text-[var(--fg-muted)] mt-1">{mission.description}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            mission.status === 'ouverte'
                              ? 'bg-blue-500/20 text-blue-400'
                              : mission.status === 'prete'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {mission.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--fg-muted)]">
                          {mission.missions_collectives_participants.length} / {mission.min_participants} participants min
                        </span>
                        <button
                          onClick={() => joinMission(mission.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/20 transition text-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          Rejoindre
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MATCHES */}
          {activeTab === 'matches' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Traders compatibles</h2>

              {matches.length === 0 ? (
                <div className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-8 text-center border border-[var(--border-subtle)]">
                  <Users2 className="w-12 h-12 mx-auto mb-4 text-[var(--fg-muted)]" />
                  <p className="text-[var(--fg-muted)]">
                    Aucun trader compatible trouvé. Complétez votre profil d'entraide.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {matches.map((match) => (
                    <motion.div
                      key={match.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-6 border border-[var(--border-subtle)]"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{match.fullName}</h3>
                          <p className="text-sm text-[var(--fg-muted)] mt-1">
                            Compétences: {match.skillsOffered.join(', ') || 'Non renseigné'}
                          </p>
                          <p className="text-sm text-[var(--fg-muted)]">
                            Disponibilités: {match.availabilityDays.join(', ') || 'Non renseigné'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[var(--primary)]">{match.score}</div>
                          <div className="text-xs text-[var(--fg-muted)]">Score compatibilité</div>
                        </div>
                      </div>
                      <button
                        onClick={() => sendContactRequest(match.userId)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition text-sm w-full justify-center"
                      >
                        <Send className="w-4 h-4" />
                        Envoyer demande contact
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-8">
              {/* Reçues */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Demandes reçues</h2>
                {contactsReceived.length === 0 ? (
                  <div className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-6 text-center border border-[var(--border-subtle)]">
                    <p className="text-[var(--fg-muted)]">Aucune demande reçue</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {contactsReceived.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-4 border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">De: {req.requester_id}</p>
                            {req.message && (
                              <p className="text-sm text-[var(--fg-muted)] mt-1">"{req.message}"</p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400'
                                : req.status === 'accepted'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => respondContact(req.id, 'accept')}
                              className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition text-sm flex-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accepter
                            </button>
                            <button
                              onClick={() => respondContact(req.id, 'decline')}
                              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm flex-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Refuser
                            </button>
                            <button
                              onClick={() => respondContact(req.id, 'block')}
                              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Envoyées */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Demandes envoyées</h2>
                {contactsSent.length === 0 ? (
                  <div className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-6 text-center border border-[var(--border-subtle)]">
                    <p className="text-[var(--fg-muted)]">Aucune demande envoyée</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {contactsSent.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--bg-secondary)]/40 backdrop-blur-sm rounded-2xl p-4 border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">À: {req.recipient_id}</p>
                            {req.message && (
                              <p className="text-sm text-[var(--fg-muted)] mt-1">"{req.message}"</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {req.status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
                            {req.status === 'accepted' && <CheckCircle className="w-4 h-4 text-green-400" />}
                            {req.status === 'declined' && <XCircle className="w-4 h-4 text-red-400" />}
                            <span className="text-sm text-[var(--fg-muted)]">{req.status}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
