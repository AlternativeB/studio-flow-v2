import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Client {
  id: string
  first_name: string
  last_name: string
}

interface ClientComboboxProps {
  clients: Client[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ClientCombobox({ clients, value, onChange, disabled }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)

  // Находим выбранного клиента для отображения имени
  const selectedClient = clients.find((client) => client.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedClient
            ? `${selectedClient.first_name} ${selectedClient.last_name}`
            : "Выберите клиента..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск по имени..." />
          <CommandList>
            <CommandEmpty>Клиент не найден.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.first_name} ${client.last_name}`} // По этому значению идет поиск
                  onSelect={() => {
                    onChange(client.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.first_name} {client.last_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}